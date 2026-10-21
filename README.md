# Kubernetes Task Manager — Containerization & Infrastructure Monitoring

A multi-container Task Manager application built to demonstrate containerization, service orchestration, infrastructure monitoring, and the path from Docker Compose to Kubernetes.

The project combines a React frontend, a FastAPI backend, and MongoDB, with Mongo Express for database administration and a monitoring stack built around Prometheus, Grafana, cAdvisor, and a MongoDB exporter.

The goal is to build a practical infrastructure project that demonstrates how to deploy, connect, monitor, and troubleshoot a containerized application.

## Table of Contents

- [Introduction](#introduction)
- [Project Objectives](#project-objectives)
- [Technology Stack](#technology-stack)
- [Infrastructure Architecture](#infrastructure-architecture)
- [Services and Responsibilities](#services-and-responsibilities)
- [Application Features](#application-features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Accessing the Services](#accessing-the-services)
- [Monitoring and Observability](#monitoring-and-observability)
- [Deploying to Kubernetes](#deploying-to-kubernetes)
- [Monitoring on Kubernetes](#monitoring-on-kubernetes)
- [Errors Encountered and Fixes](#errors-encountered-and-fixes)
- [Kubernetes Errors and Fixes](#kubernetes-errors-and-fixes)
- [Quick Troubleshooting Reference](#quick-troubleshooting-reference)
- [Project Roadmap](#project-roadmap)
- [Learning Outcomes](#learning-outcomes)
- [Security Notes](#security-notes)

## Introduction

Modern applications are rarely deployed as a single process. They typically consist of multiple services that communicate over a network, store persistent data, and require continuous monitoring.

This project explores that architecture by deploying a Task Manager application using Docker Compose.

The application separates the user interface, API, and database into individual containers. Supporting services provide browser-based database administration and infrastructure metrics, allowing the application to be inspected and monitored during operation.

The first deployment uses Docker Compose. The application was then migrated to Kubernetes (on Docker Desktop) with Deployments, Services, Secrets, persistent storage, health probes, an Ingress, and a lightweight Prometheus and Grafana monitoring setup. The next stage is deployment automation (CI/CD) and a remote server.

## Project Objectives

- Containerize a React frontend and Python backend.
- Deploy MongoDB as a persistent database service.
- Orchestrate multiple containers using Docker Compose.
- Configure service-to-service communication and port mappings.
- Manage persistent data using Docker volumes.
- Inspect database records through Mongo Express.
- Collect container, application, and database metrics using cAdvisor, FastAPI instrumentation, a MongoDB exporter, and Prometheus.
- Visualize monitoring data using Grafana dashboards.
- Troubleshoot container startup, health checks, and connectivity.
- Progress toward a Kubernetes deployment with infrastructure monitoring.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Python | Backend programming language |
| FastAPI | REST API framework |
| prometheus-fastapi-instrumentator | Exposes FastAPI request metrics at `/metrics` |
| MongoDB | Document-oriented database |
| Mongo Express | Browser-based MongoDB administration |
| Percona MongoDB Exporter | Exposes MongoDB statistics as Prometheus metrics |
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Nginx | Serves the compiled React frontend |
| cAdvisor | Collects container resource metrics |
| Prometheus | Scrapes and stores time-series metrics |
| Grafana | Monitoring dashboards and visualization |
| Kubernetes | Container orchestration (Docker Desktop cluster) |
| kubectl | Command-line client for the cluster |
| Helm | Installs Prometheus and Grafana as charts |
| ingress-nginx | Ingress controller that routes browser traffic to the Services |
| Git and GitHub | Version control and project documentation |

## Infrastructure Architecture

The following diagram represents the current Docker Compose design.

```mermaid
flowchart TB
    USER(["Browser"])

    subgraph APP["Application stack"]
        FE["Frontend<br/>Nginx, :3000"]
        API["Backend<br/>FastAPI, :8000"]
        DB[("MongoDB<br/>:27017")]
        ME["Mongo Express<br/>:8081"]
    end

    subgraph MON["Monitoring stack"]
        GRAF["Grafana<br/>:3001"]
        PROM["Prometheus<br/>:9090"]
        EXP["Mongo exporter<br/>:9216"]
        CAD["cAdvisor<br/>:8082"]
    end

    USER -->|loads UI| FE
    USER -->|REST calls| API
    API --> DB
    ME --> DB

    GRAF -->|queries| PROM
    PROM -->|scrapes /metrics| API
    PROM -->|scrapes| EXP
    PROM -->|scrapes| CAD
    EXP -->|reads stats| DB

    classDef user fill:#FAEEDA,stroke:#854F0B,color:#412402
    classDef ui fill:#E6F1FB,stroke:#185FA5,color:#0C447C
    classDef api fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    classDef db fill:#EAF3DE,stroke:#3B6D11,color:#173404
    classDef prom fill:#FAECE7,stroke:#993C1D,color:#4A1B0C
    classDef exp fill:#EEEDFE,stroke:#534AB7,color:#26215C
    class USER user
    class FE,ME,GRAF ui
    class API api
    class DB db
    class PROM prom
    class EXP,CAD exp

    linkStyle 0,1 stroke:#378ADD,stroke-width:2px
    linkStyle 2,3,8 stroke:#1D9E75,stroke-width:2px
    linkStyle 4 stroke:#7F77DD,stroke-width:2px
    linkStyle 5,6,7 stroke:#D85A30,stroke-width:2px
```

| Color | Role |
|---|---|
| Amber | Browser |
| Blue | Web interfaces (Frontend, Mongo Express, Grafana) |
| Teal | API (FastAPI backend) |
| Green | Database (MongoDB) |
| Coral | Metrics collection (Prometheus) |
| Purple | Exporters (Mongo exporter, cAdvisor) |

Arrow colors show the kind of call: blue for user requests, green for data access, coral for Prometheus scrapes, and purple for Grafana queries. Persistent Docker volumes (`mongo_data`, `prometheus_data`, `grafana_data`) are not drawn.

### Architecture Overview

1. **Frontend:** Nginx serves the compiled React application to the browser.
2. **Backend:** FastAPI exposes REST endpoints for creating, retrieving, updating, and deleting tasks, plus a `/metrics` endpoint for Prometheus.
3. **Database:** MongoDB stores task records and persists them using a Docker volume.
4. **Database administration:** Mongo Express provides a web interface for inspecting MongoDB.
5. **Metrics collection:** cAdvisor collects container resource usage, and the MongoDB exporter exposes database statistics.
6. **Metrics storage:** Prometheus scrapes the configured targets and stores their metrics.
7. **Visualization:** Grafana connects to Prometheus and displays monitoring dashboards.

> **Networking note:** The browser accesses the API using `http://localhost:8000`. Containers communicate through their Compose service names. For example, the backend connects to MongoDB using `mongodb:27017`, while Grafana accesses Prometheus using `http://prometheus:9090`.

## Services and Responsibilities

| Service | Container Name | Host Port | Responsibility |
|---|---|---:|---|
| React + Nginx | `task_manager_frontend` | 3000 (container 8080) | Serves the web interface |
| FastAPI | `task_manager_api` | 8000 | Application API and `/metrics` |
| MongoDB | `task_manager_db` | 27017 | Stores application data |
| Mongo Express | `task_manager_mongo_ui` | 8081 | Database administration |
| MongoDB Exporter | `task_manager_mongo_exporter` | none (internal 9216) | Database metrics for Prometheus |
| cAdvisor | `task_manager_cadvisor` | 8082 (container 8080) | Container metrics |
| Prometheus | `task_manager_prometheus` | 9090 | Metrics collection and storage |
| Grafana | `task_manager_grafana` | 3001 (container 3000) | Monitoring dashboards |

Grafana is mapped to host port 3001 because host port 3000 is used by the frontend.

## Application Features

The Task Manager application is designed to support:

- Viewing the task list.
- Creating tasks.
- Updating task completion status.
- Deleting tasks.
- Storing tasks in MongoDB through the FastAPI backend.
- Communicating with the API through HTTP requests.

The exact functionality depends on the application code currently implemented.

## Project Structure

```text
kube/
├── Backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env
│   ├── database/
│   ├── models/
│   ├── routes/
│   └── services/
│
├── frontend/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── note.txt
│   ├── node_modules/        (not committed)
│   ├── public/
│   └── src/
│
├── grafana/
│   └── provisioning/
│       └── datasources/
│           └── datasource.yml
│
├── docs/
│   └── images/
│       └── kubernetes-monitoring-stack-architecture.png
│
├── kubernetes/
│   ├── namespace.yaml
│   ├── secret.yaml
│   ├── pvc.yaml
│   ├── deployment-mongodb.yaml
│   ├── service-mongo.yaml
│   ├── deployment-backend.yaml
│   ├── service-backend.yaml
│   ├── deployment-frontend.yaml
│   ├── service-frontend.yaml
│   ├── ingress.yaml
│   └── monitoring/
│       ├── lite/                    (used on a low-memory machine)
│       │   ├── prometheus-values.yaml
│       │   ├── grafana-values.yaml
│       │   └── mongodb-exporter.yaml
│       └── full-stack/              (kube-prometheus-stack, needs more RAM)
│           ├── values.yaml
│           ├── servicemonitor-backend.yaml
│           └── mongodb-exporter.yaml
│
├── prometheus/
│   └── prometheus.yml
│
├── docker-compose.yml
├── LICENSE
└── README.md
```

- `Backend/` and `frontend/` hold the application code and their Dockerfiles.
- `grafana/` and `prometheus/` hold the monitoring configuration mounted into the containers by Docker Compose.
- `kubernetes/` holds the manifests for the Kubernetes migration, one resource per file. Apply them with `kubectl apply -f kubernetes/` (the namespace and secret must exist first, so apply `namespace.yaml` before the others). The `kubernetes/monitoring/` subfolder is not applied by that command. It holds the Helm values for `kube-prometheus-stack` and the ServiceMonitors, which are installed separately after the Helm chart (see below).
- `docker-compose.yml` is the Docker Compose deployment.

## Prerequisites

Install the following before running the project:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Docker Compose v2
- Git
- A modern web browser
- For the Kubernetes part: Kubernetes enabled in Docker Desktop, [kubectl](https://kubernetes.io/docs/tasks/tools/), and [Helm](https://helm.sh/docs/intro/install/)

Docker Desktop should be running before you execute Compose commands.

**Recommended resources:** at least 2 CPU cores and 4 GB of RAM available to Docker. With less memory, the stack starts slowly and health checks time out (see [Error 18](#error-18-slow-startup-and-timeouts-on-a-low-memory-host)).

## Getting Started

> **Note:** The Docker Compose files (`docker-compose.yml`, `prometheus/`, `grafana/`) are kept locally and are not part of this repository (see `.gitignore`). The Kubernetes manifests in `kubernetes/` are included. See [Deploying to Kubernetes](#deploying-to-kubernetes).

### 1. Clone the repository

Replace the placeholder with your actual GitHub repository URL.

```bash
git clone <your-repository-url>
cd kube
```

### 2. Verify the configuration files

Ensure the project contains:

- `docker-compose.yml`
- `Backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `prometheus/prometheus.yml`
- `grafana/provisioning/datasources/datasource.yml`

### 3. Validate the Docker Compose configuration

```bash
docker compose config --quiet
```

No output means the file is valid. Use `docker compose config` (without `--quiet`) to print the resolved configuration, including the final environment values each container receives.

### 4. Build and start the services

On a low-memory host, start the application first and the monitoring services afterwards:

```bash
docker compose up -d --build mongodb backend frontend mongo-express
docker compose up -d cadvisor prometheus grafana mongodb-exporter
```

On a machine with enough resources, one command is enough:

```bash
docker compose up -d --build
```

### 5. Check container status

```bash
docker compose ps
```

`task_manager_db` and `task_manager_api` should show `healthy`.

### 6. Inspect service logs

```bash
docker compose logs --tail=100 mongodb
docker compose logs --tail=100 backend
docker compose logs --tail=100 prometheus
docker compose logs --tail=100 grafana
```

For live logs from all services:

```bash
docker compose logs -f
```

## Accessing the Services

| Service | URL |
|---|---|
| Task Manager frontend | [http://localhost:3000](http://localhost:3000) |
| FastAPI API documentation | [http://localhost:8000/docs](http://localhost:8000/docs) |
| Backend health endpoint | [http://localhost:8000/health](http://localhost:8000/health) |
| Backend metrics | [http://localhost:8000/metrics](http://localhost:8000/metrics) |
| Mongo Express | [http://localhost:8081](http://localhost:8081) |
| cAdvisor | [http://localhost:8082](http://localhost:8082) |
| Prometheus | [http://localhost:9090](http://localhost:9090) |
| Prometheus targets | [http://localhost:9090/targets](http://localhost:9090/targets) |
| Grafana | [http://localhost:3001](http://localhost:3001) |

Mongo Express is protected with the credentials configured in the Compose file. Grafana's admin login is set through the `GF_SECURITY_ADMIN_*` environment variables in the Compose file. Change the example passwords before sharing the project.

> **Important:** The browser origin of the frontend (`http://localhost:3000`) must be listed in the backend's CORS `allow_origins`. See [Error 5](#error-5-frontend-cannot-reach-the-backend-cors).

## Monitoring and Observability

### cAdvisor

cAdvisor exposes container-level metrics, including CPU usage, memory consumption, and container activity.

Open `http://localhost:8082`.

> **Known limitation on Docker Desktop:** cAdvisor can fail to identify individual containers when Docker Desktop uses the containerd image store, so it may report only the whole VM (`id="/"`). See [Error 12](#error-12-cadvisor-shows-only-the-whole-host).

### Backend metrics (FastAPI)

The backend uses `prometheus-fastapi-instrumentator` to expose request counts, latency, and status codes at `/metrics`.

Add to `Backend/requirements.txt`:

```text
prometheus-fastapi-instrumentator
```

Add to `Backend/main.py`:

```python
from prometheus_fastapi_instrumentator import Instrumentator

# after app = FastAPI(...) and app.include_router(...)
Instrumentator().instrument(app).expose(app)
```

### MongoDB exporter

MongoDB has no metrics endpoint of its own, so the Percona exporter connects to the database and exposes statistics on port 9216 for Prometheus. It is defined as the `mongodb-exporter` service in `docker-compose.yml` and uses the same root credentials as the database.

### Prometheus

Prometheus scrapes metrics from the targets listed in `prometheus/prometheus.yml`. The cAdvisor job uses a longer timeout because scrapes are slow on low-memory hosts.

```yaml
global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'cadvisor'
    scrape_interval: 60s
    scrape_timeout: 50s
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'backend'
    scrape_interval: 30s
    scrape_timeout: 20s
    static_configs:
      - targets: ['backend:8000']

  - job_name: 'mongodb'
    scrape_interval: 30s
    scrape_timeout: 20s
    static_configs:
      - targets: ['mongodb-exporter:9216']
```

Prometheus only reads this file at startup. After editing it, run:

```bash
docker compose up -d --force-recreate prometheus
```

Open `http://localhost:9090/targets` and verify that every target is `UP`. In the query box, `up` returns one series per target, and `up == 0` lists only the failing ones.

### Grafana

Grafana visualizes metrics collected by Prometheus. The data source is created automatically from `grafana/provisioning/datasources/datasource.yml`.

1. Open `http://localhost:3001` and sign in.
2. Go to **Connections → Data sources** and confirm that **Prometheus** exists.
3. If it is missing, add it manually with the URL `http://prometheus:9090` (including `http://`, with no spaces).
4. Click **Save & test**.
5. Open **Explore** and run `up` to confirm data is flowing.
6. Import or build dashboards for the metrics you need.

Useful queries:

```text
up
mongodb_up
sum by (handler, status) (rate(http_requests_total[5m]))
histogram_quantile(0.95, sum by (le, handler) (rate(http_request_duration_seconds_bucket[5m])))
```

> **Monitoring scope:** cAdvisor provides container metrics where the host supports it, FastAPI instrumentation provides application-level metrics, and the MongoDB exporter provides database metrics.

## Deploying to Kubernetes

The same application runs on Kubernetes (tested on Docker Desktop's built-in cluster). The manifests are in `kubernetes/`, one resource per file.

### How the Compose setup maps to Kubernetes

| Docker Compose | Kubernetes | File |
|---|---|---|
| Project network | Namespace `task-manager` | `namespace.yaml` |
| `environment:` credentials | Secret `mongodb-secret` | `secret.yaml` |
| `mongo_data` volume | PersistentVolumeClaim `mongodb-pvc` | `pvc.yaml` |
| `mongodb` service | Deployment and `mongodb-service` | `deployment-mongodb.yaml`, `service-mongo.yaml` |
| `backend` service | Deployment and `backend-service` | `deployment-backend.yaml`, `service-backend.yaml` |
| `frontend` service | Deployment and `frontend-service` | `deployment-frontend.yaml`, `service-frontend.yaml` |
| Published ports | Ingress | `ingress.yaml` |
| `healthcheck:` | Readiness and liveness probes | in each Deployment |

### Traffic and monitoring flow

```mermaid
flowchart TB
    USER(["Browser"])
    CTRL["Ingress controller<br/>ingress-nginx namespace"]

    subgraph APP["task-manager namespace"]
        FE["frontend-service :80<br/>Frontend pod (Nginx)"]
        API["backend-service :8000<br/>Backend pod (FastAPI)"]
        DB[("mongodb-service :27017<br/>MongoDB pod + PVC")]
        EXP["mongodb-exporter :9216"]
    end

    subgraph MON["monitoring namespace"]
        PROM["prometheus-server :80"]
        GRAF["grafana :80"]
    end

    USER -->|"localhost"| CTRL
    USER -->|"grafana.localhost<br/>prometheus.localhost"| CTRL
    CTRL -->|"/"| FE
    CTRL -->|"/api"| API
    CTRL -->|"host rules"| GRAF
    CTRL -->|"host rules"| PROM
    API --> DB
    EXP --> DB
    PROM -->|"scrapes /metrics"| API
    PROM -->|"scrapes"| EXP
    GRAF -->|"queries"| PROM

    classDef user fill:#FAEEDA,stroke:#854F0B,color:#412402
    classDef ui fill:#E6F1FB,stroke:#185FA5,color:#0C447C
    classDef api fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    classDef db fill:#EAF3DE,stroke:#3B6D11,color:#173404
    classDef prom fill:#FAECE7,stroke:#993C1D,color:#4A1B0C
    classDef exp fill:#EEEDFE,stroke:#534AB7,color:#26215C
    class USER user
    class FE,GRAF,CTRL ui
    class API api
    class DB db
    class PROM prom
    class EXP exp
```

### Architecture diagram

![Kubernetes monitoring stack architecture](docs/images/kubernetes-monitoring-stack-architecture.png)

### Steps

**1. Build the images.** The Deployments use local images, so they set `imagePullPolicy: IfNotPresent`.

```bash
docker build -t kube-backend:latest ./Backend
docker build -t kube-frontend:k8s --build-arg REACT_APP_API_URL=http://localhost ./frontend
```

`REACT_APP_API_URL` is baked into the frontend at build time. Use `http://localhost` when traffic goes through the Ingress, or `http://localhost:8000` if you use port-forwarding.

**2. Install an ingress controller** (skip if you use port-forwarding).

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/cloud/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=180s
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

`EXTERNAL-IP` should be `localhost`. The manifest creates its own `ingress-nginx` namespace, so no `-n` flag is needed.

> **Note:** The ingress-nginx project was retired in March 2026. Existing installations keep working, but it receives no security fixes, so use it only on a local machine. Maintained alternatives include other ingress controllers and Gateway API implementations.

**3. Apply the manifests.** Apply the namespace first, because files are processed alphabetically.

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/
kubectl get pods -n task-manager -w
```

Wait until the pods show `1/1 Running`. MongoDB starts first, and the backend becomes ready once it reaches the database.

**4. Verify.**

```bash
kubectl get ingress -n task-manager
kubectl get endpoints -n task-manager
curl.exe http://localhost/api/tasks
```

Then open `http://localhost`, add a task, and refresh to confirm that it persists.

**Without an Ingress**, use two port-forwards in separate terminals and build the frontend with `http://localhost:8000`:

```bash
kubectl port-forward -n task-manager svc/frontend-service 3000:80
kubectl port-forward -n task-manager svc/backend-service 8000:8000
```

### Health probes

| Pod | Readiness | Liveness |
|---|---|---|
| Backend | `/health` (also checks MongoDB) | `/health/live` (process only) |
| Frontend | `/` | `/` |
| MongoDB | TCP port 27017 | TCP port 27017 |

Probe timeouts must be generous on a slow node. The default `timeoutSeconds` is 1 second (see [Error 29](#error-29-pods-restart-or-stay-01-on-a-slow-node)).

## Monitoring on Kubernetes

Two configurations are provided in `kubernetes/monitoring/`:

| Folder | Charts | Use when |
|---|---|---|
| `lite/` | `prometheus-community/prometheus` and `grafana-community/grafana` | Low-memory machines (used in this project) |
| `full-stack/` | `prometheus-community/kube-prometheus-stack` | Machines with at least 6 GB free for the cluster (the Prometheus Operator and ServiceMonitors) |

### Install the lightweight stack

Run these from the project root.

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/prometheus -n monitoring --create-namespace -f kubernetes/monitoring/lite/prometheus-values.yaml
kubectl apply -f kubernetes/monitoring/lite/mongodb-exporter.yaml
helm install grafana grafana-community/grafana -n monitoring -f kubernetes/monitoring/lite/grafana-values.yaml
kubectl apply -f kubernetes/monitoring/lite/ingress-monitoring.yaml
```

Change the Grafana `adminPassword` in `grafana-values.yaml` first.

### What it scrapes

`prometheus-values.yaml` replaces the chart's default scrape jobs with a short list:

| Job | Provides |
|---|---|
| `prometheus` | Prometheus' own metrics |
| `kubernetes-nodes-cadvisor` | Container CPU and memory per pod, read from the kubelets |
| `backend` | FastAPI request metrics at `backend-service:8000/metrics` |
| `mongodb` | MongoDB metrics from the exporter at `mongodb-exporter:9216` |

Alertmanager, node-exporter, the pushgateway, and kube-state-metrics are disabled to save memory. Persistence is also disabled, so metrics are lost when the Prometheus pod restarts.

### Access

| Tool | Through the Ingress | With port-forward |
|---|---|---|
| Prometheus | `http://prometheus.localhost` | `kubectl port-forward -n monitoring svc/prometheus-server 9090:80` |
| Grafana | `http://grafana.localhost` | `kubectl port-forward -n monitoring svc/grafana 3001:80` |

Prometheus has no login. Never expose it publicly.

### Verify

In Prometheus, open **Status → Target health** (all four jobs should be `UP`), then run:

```text
up
sum by (pod) (container_memory_working_set_bytes{namespace="task-manager", container!=""})
sum by (handler, status) (rate(http_requests_total[5m]))
mongodb_up
```

### Changing the configuration

Always pass the values file when upgrading. Without `-f`, Helm resets every setting to the chart defaults:

```bash
helm upgrade prometheus prometheus-community/prometheus -n monitoring -f kubernetes/monitoring/lite/prometheus-values.yaml --timeout 10m
helm get values prometheus -n monitoring
```

## Errors Encountered and Fixes

Each entry lists the symptom, the root cause, and the fix applied during this project.

### Frontend build errors

#### Error 1: Build context disconnect (`/nginx.conf: not found`)

- **Symptom:** The build failed early with a `failed to compute cache key` error stating that `nginx.conf` or `package.json` paths could not be resolved.
- **Root cause:** A misunderstanding of the Docker build context. The build ran with the context set to the `frontend/` directory, but the Dockerfile used nested paths (such as `COPY ./frontend/package.json ./`) or tried to reach a file outside that folder. Docker cannot access files outside its defined context.
- **Fix:**
  1. Align the terminal's working directory (or the Compose `context:`) with the build context.
  2. Use paths relative to the context in the Dockerfile (`COPY . .` instead of repeating the folder name).

#### Error 2: Bloated cache and context transfer time (`npm ci` taking a long time)

- **Symptom:** The `[builder 4/6] RUN npm ci` step stalled and took a long time.
- **Root cause:** The build context included local host directories such as a large `node_modules` folder or build artifacts, which were uploaded to the Docker daemon. On the first run of a cache-mounted layer (`--mount=type=cache`), npm also performs a complete cold install over the network.
- **Fix:**
  1. Add an optimized `.dockerignore` that blocks the host's local `node_modules` and caches from being transferred.
  2. Use `--network=host` to bypass virtual network bridge overhead in Docker Desktop on Windows.
  3. Keep `--mount=type=cache,target=/root/.npm` so later builds reuse a persistent local cache instead of downloading from the registry again.

#### Error 3: Multi-stage artifact mismatch (`/app/dist: not found`)

- **Symptom:** The step `[runner 3/3] COPY --from=builder /app/dist` failed with a `not found` error at the end of the build.
- **Root cause:** The runner stage expected the output directory of a different build tool. The guide followed assumed Vite (output in `/app/dist`), but this project uses Create React App (`react-scripts`), which writes to `/app/build`.
- **Fix:** Change the artifact copy to match the compiler's output directory:

  ```dockerfile
  COPY --from=builder /app/build /usr/share/nginx/html
  ```

### Startup and connectivity errors

#### Error 4: MongoDB container is unhealthy

- **Symptom:**

  ```text
  Container task_manager_db  Error dependency mongodb failed to start
  dependency failed to start: container task_manager_db is unhealthy
  ```

- **Root cause:** MongoDB itself was running. The health check was failing:
  1. The first version piped `mongosh` output into `grep -q 'ok: 1'`, which is fragile because the output format varies.
  2. After removing `grep`, every check still ended with `Health check exceeded timeout`. Each check launched a full `mongosh` (Node.js) process, which took longer than the timeout on a slow, low-memory host, especially while images were being pulled and several containers started at once.
- **Fix:**
  1. Inspect the real result with `docker inspect --format='{{json .State.Health}}' task_manager_db`.
  2. Replace the `mongosh` check with a lightweight TCP check that returns in milliseconds, and allow a longer start period:

     ```yaml
     healthcheck:
       test: ["CMD-SHELL", "timeout 5 bash -c '</dev/tcp/127.0.0.1/27017'"]
       interval: 15s
       timeout: 10s
       retries: 10
       start_period: 60s
     ```

  3. The backend's `/health` endpoint still verifies the real database connection.

#### Error 5: Frontend cannot reach the backend (CORS)

- **Symptom:** The frontend showed "Could not connect to the backend", while `http://localhost:8000` opened fine directly in the browser.
- **Root cause:** CORS. The frontend was served from `http://localhost:8080`, but the backend's `allow_origins` only listed `http://localhost:3000` and `http://localhost:5173`. The browser blocked the cross-origin responses. Opening port 8000 directly is not a cross-origin request, so it worked.
- **Fix:**
  1. Serve the frontend on an allowed origin by mapping `"3000:8080"` in Compose (host 3000, container 8080), or add `http://localhost:8080` to `allow_origins`.
  2. Rebuild or recreate the affected container.
  3. Make the allowed origins configurable so they can change for Kubernetes:

     ```python
     import os

     origins = os.getenv(
         "CORS_ORIGINS",
         "http://localhost:3000,http://localhost:5173,http://localhost:8080",
     ).split(",")
     ```

  4. Verify with `curl -i -H "Origin: http://localhost:3000" http://localhost:8000/api/tasks` and look for `access-control-allow-origin`.
  5. Use `localhost`, not `127.0.0.1`. The browser treats them as different origins.

#### Error 6: Compose validation error (`additional properties 'cadvisor' not allowed`)

- **Symptom:**

  ```text
  validating docker-compose.yml: services.frontend additional properties 'cadvisor' not allowed
  ```

- **Root cause:** An indentation mistake. The `cadvisor:` block was pasted with extra indentation, so YAML read it as a setting inside `frontend:` instead of a separate service.
- **Fix:** Every service name must start at exactly 2 spaces under `services:`. Validate before applying with `docker compose config --quiet`.

#### Error 7: Port conflict between Grafana and the frontend

- **Symptom:** Grafana and the frontend both wanted host port 3000.
- **Root cause:** Grafana listens on port 3000 inside its container by default, and the frontend was moved to host port 3000.
- **Fix:** Map Grafana as `"3001:3000"` and open it at `http://localhost:3001`.

#### Error 8: Backend `/health` returns 503 and the backend is unhealthy

- **Symptom:** The backend started (`Uvicorn running`) but `GET /health` returned 503 and the container was marked unhealthy. The traceback ended with:

  ```text
  pymongo.errors.OperationFailure: Authentication failed.
  ```

- **Root cause:** `/health` returns 503 when the database connection check fails. MongoDB was reachable, but the password in the backend's `MONGO_URI` differed from the one MongoDB was initialised with. `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` are only applied on the first start with an empty volume, so later changes in the Compose file have no effect on an existing volume.
- **Fix:**
  1. Compare the passwords without printing them, using hashes:

     ```bash
     docker exec task_manager_api sh -c "printf '%s' \"\$MONGO_URI\" | sed -E 's#^[^:]+://[^:]+:([^@]*)@.*#\1#' | sha256sum"
     docker exec task_manager_db sh -c "printf '%s' \"\$MONGO_INITDB_ROOT_PASSWORD\" | sha256sum"
     ```

  2. Use the same password in all four places: `mongodb`, `mongo-express`, the `mongodb-exporter` command, and the backend `MONGO_URI`.
  3. If the stored user in the volume still differs, reset only the MongoDB volume (this deletes the tasks):

     ```bash
     docker compose down
     docker volume rm kube_mongo_data
     docker compose up -d mongodb
     ```

     Wait until `task_manager_db` is healthy, then run `docker compose up -d`.

#### Error 9: Backend crashes with `Invalid URI scheme`

- **Symptom:** The backend never started listening, the healthcheck got `Connection refused`, and the logs ended with:

  ```text
  pymongo.errors.InvalidURI: Invalid URI scheme: URI must begin with 'mongodb://' or 'mongodb+srv://'
  ```

- **Root cause:** A copy-and-paste error in the Compose file. The value contained the variable name twice, so the container received the literal text `MONGO_URI: mongodb://...`:

  ```yaml
  MONGO_URI: "MONGO_URI: mongodb://root:<password>@mongodb:27017/task_manager?authSource=admin"
  ```

  `database/connection.py` creates the `MongoClient` when the module is imported, so the app crashed before the server could start.
- **Fix:** The value must start directly with `mongodb://`:

  ```yaml
  MONGO_URI: "mongodb://root:<password>@mongodb:27017/task_manager?authSource=admin"
  ```

  Check the resolved value with `docker compose config | findstr MONGO_URI` (Windows) or `docker compose config | grep MONGO_URI`, then recreate the service with `docker compose up -d --force-recreate backend`. Use quotes only in the `KEY: value` style, never in the `- KEY=value` list style.

#### Error 10: Backend healthcheck too heavy for a slow host

- **Symptom:** The backend was marked unhealthy even though it was running, and the frontend (which waits for it) stayed in `Created`.
- **Root cause:** The healthcheck starts a Python process and calls `/health`, which also queries MongoDB. On a slow host, this exceeds short timeouts.
- **Fix:** Use the cheap liveness endpoint in the Docker healthcheck, and keep `/health` for full readiness checks (and later for Kubernetes readiness probes):

  ```yaml
  healthcheck:
    test:
      - CMD
      - python
      - -c
      - "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live', timeout=20)"
    interval: 30s
    timeout: 40s
    retries: 10
    start_period: 120s
  ```

### Monitoring errors

#### Error 11: Prometheus target `cadvisor` is DOWN (`context deadline exceeded`)

- **Symptom:** On the Targets page, `cadvisor` showed `DOWN` with `Get "http://cadvisor:8080/metrics": context deadline exceeded`.
- **Root cause:** The network path was fine. cAdvisor took about 10.7 seconds to answer, longer than the 10-second `scrape_timeout`. Even Prometheus scraping itself took about 3 seconds, which indicates a slow host.
- **Fix:**
  1. Give that job a longer interval and timeout (the timeout must not exceed the interval):

     ```yaml
     - job_name: 'cadvisor'
       scrape_interval: 60s
       scrape_timeout: 50s
     ```

  2. Reduce cAdvisor's work in Compose:

     ```yaml
     command:
       - --housekeeping_interval=30s
       - --disable_metrics=percpu,sched,tcp,udp,advtcp,hugetlb,referenced_memory,process
     ```

  3. Recreate Prometheus so it re-reads the file: `docker compose up -d --force-recreate prometheus`.

#### Error 12: cAdvisor shows only the whole host

- **Symptom:** `container_memory_usage_bytes` returned a single series with `id="/"`, and no `task_manager_*` containers appeared in Prometheus or Grafana. The cAdvisor logs were full of:

  ```text
  Failed to create existing container: /docker/<id>: failed to identify the read-write layer ID ...
  open /rootfs/var/lib/docker/image/overlayfs/layerdb/mounts/<id>/mount-id: no such file or directory
  ```

- **Root cause:** cAdvisor finds each container's cgroup, then looks up its storage layer under `/var/lib/docker/image/overlayfs/layerdb/`. On Docker Desktop with the containerd image store enabled, that directory does not exist, so cAdvisor drops every container and reports only the root cgroup. Flags and extra mounts cannot fix this.
- **Fix (choose one):**
  1. Disable **Use containerd for pulling and storing images** in Docker Desktop (Settings → General), restart, and rebuild the images. Back up any data you need first.
  2. Monitor the application instead of the container runtime: use FastAPI instrumentation (Error 14) and `docker stats` for per-container CPU and memory.
  3. Keep cAdvisor for whole-host CPU and memory only.

#### Error 13: Grafana cannot reach Prometheus (`connection refused` and `invalid URL`)

- **Symptom:** Grafana reported:

  ```text
  Post "http://localhost:9090/api/v1/query": dial tcp [::1]:9090: connect: connection refused
  ```

  After editing the URL, Grafana showed `Validation error, invalid URL`.
- **Root cause:**
  1. `localhost` inside the Grafana container is Grafana itself, not Prometheus. Containers reach each other by service name.
  2. Grafana rejects a URL without the `http://` scheme, or with stray spaces or characters.
- **Fix:** Set the data source URL to exactly `http://prometheus:9090`, typed by hand, then click **Save & test**. If the URL field is read-only, the data source comes from `grafana/provisioning/datasources/datasource.yml`. Correct the `url:` line there and recreate Grafana with `docker compose up -d --force-recreate grafana`.

#### Error 14: Prometheus has no metrics from the application containers

- **Symptom:** `up` listed only `prometheus` and `cadvisor`, and nothing from the backend, MongoDB, or other services.
- **Root cause:** Prometheus does not discover containers automatically. It scrapes only the targets in `prometheus.yml`, and each service must expose its own `/metrics` endpoint.
- **Fix:**
  1. Add `prometheus-fastapi-instrumentator` to the backend and expose `/metrics` (see [Backend metrics](#backend-metrics-fastapi)).
  2. Add the `mongodb-exporter` service, with credentials matching the database.
  3. Add `backend` and `mongodb` jobs to `prometheus.yml`.
  4. Rebuild the backend, then recreate Prometheus:

     ```bash
     docker compose up -d --build backend
     docker compose up -d --force-recreate prometheus
     ```

  5. Confirm every target is `1` in the `up` query or `UP` on the Targets page.

#### Error 15: Grafana shows "failed to load its application files"

- **Symptom:** Grafana's own error page appeared, listing proxy and sub-path suggestions.
- **Root cause:** The container was running and serving the page, so the failure was in the browser loading Grafana's JavaScript files. The usual causes are a stale browser cache, an ad-blocker or privacy extension, or a proxy rewriting asset requests.
- **Fix:**
  1. Open Grafana in an incognito window and hard refresh with Ctrl+Shift+R.
  2. Check the browser's Network tab for failing `/public/build/` files.
  3. If Docker runs on a remote machine or behind a proxy, set `GF_SERVER_ROOT_URL` to the address actually used.

### Environment errors

#### Error 16: Mongo Express and other services waiting on MongoDB

- **Symptom:** `docker compose up -d` printed `Container task_manager_db Waiting`, and dependent services stayed in `Created`.
- **Root cause:** This is expected behaviour. `depends_on` with `condition: service_healthy` holds dependent services until the database health check passes, and on a slow host the first start can take several minutes.
- **Fix:** Wait, and watch with `docker compose ps mongodb`. To work on one service in the meantime, start it without waiting: `docker compose up -d --no-deps backend`.

#### Error 17: Possible duplicate monitoring containers

- **Symptom:** Container names such as `cadvisor`, `prometheus`, and `grafana` appeared next to `task_manager_cadvisor` and similar names.
- **Root cause:** Older service definitions remained in the Compose file (or another Compose file in the project), so two sets of monitoring services were being created and competing for the same host ports.
- **Fix:** Keep one definition of each service, and check with `docker compose ps -a`.

#### Error 18: Slow startup and timeouts on a low-memory host

- **Symptom:** Everything was slow: MongoDB took about 17 seconds to create its storage engine, `mongosh` took more than 30 seconds to start, simple queries took seconds, and cAdvisor reported a Docker memory limit of about 2.8 GB at 86% usage.
- **Root cause:** On Windows, Docker Desktop runs containers in a hidden Linux VM (WSL2) with its own memory and CPU limits. With the default limits, MongoDB, Mongo Express, the backend, Prometheus, Grafana, and cAdvisor all competed for about 2.8 GB.
- **Fix:**
  1. Raise the VM limits in `C:\Users\<your-name>\.wslconfig`, leaving at least 2 GB for Windows:

     ```ini
     [wsl2]
     memory=4GB
     processors=4
     ```

     Then run `wsl --shutdown` and restart Docker Desktop.
  2. Start the services in stages (application first, monitoring second).
  3. Use lightweight health checks (Errors 4 and 10) and longer scrape timeouts (Error 11).
  4. Stop heavy optional services (`cadvisor`, `mongo-express`) when they are not needed.
  5. Keep the project inside the WSL filesystem rather than on a `C:\` path, because bind mounts from Windows drives are slow.

## Kubernetes Errors and Fixes

Problems met while moving the application and its monitoring to Kubernetes. Most of the slowness-related ones come from running a three-node cluster in a Docker VM with under 4 GB of memory (see [Error 39](#error-39-hardware-limits-are-the-root-cause-of-the-instability)).

### Manifest errors

#### Error 19: Invalid namespace names

- **Symptom:** `kubectl apply` rejected the files, or resources were not found. The files used `Task Manager`, `"Task Manager"` and `"Task-Manager"`.
- **Root cause:** Namespace names must be lowercase letters, numbers and hyphens (a DNS-1123 label). Spaces and capitals are invalid, and a label value cannot contain a space either.
- **Fix:** Use `task-manager` in `namespace.yaml` (including the `name` label) and in every other manifest.

#### Error 20: Resources created in the wrong namespace

- **Symptom:** The Secret and the Ingress could not be found by the pods and Services.
- **Root cause:** `secret.yaml` and `ingress.yaml` had no `namespace:`, so they were created in `default`. Pods can only read Secrets from their own namespace, and an Ingress can only point to Services in its own namespace.
- **Fix:** Add `namespace: task-manager` to every namespaced resource. Apply `namespace.yaml` first, then `kubectl apply -f kubernetes/`.

#### Error 21: Secret key names do not match

- **Symptom:** The MongoDB pod showed `CreateContainerConfigError`.
- **Root cause:** `secret.yaml` defines `mongo-root-username` and `mongo-root-password`, but the MongoDB Deployment asked for `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD`.
- **Fix:** Use the Secret's key names in every `secretKeyRef`. The `describe pod` events name the missing key.

#### Error 22: PVC name mismatch and the wrong storage class

- **Symptom:** The MongoDB pod stayed `Pending`.
- **Root cause:** The Deployment mounted a claim called `mongo-data`, but the PVC was named `mongodb-pvc`. The PVC also set `storageClassName: "standard"`, a class that exists on kind and minikube but not on Docker Desktop (`hostpath`).
- **Fix:** Set `claimName: mongodb-pvc`, and remove `storageClassName` so the cluster's default class is used. Check with `kubectl get storageclass` and `kubectl get pvc -n task-manager`. Also use `strategy: Recreate` so two pods never share a single-writer volume.

#### Error 23: Backend `MONGO_URI` read from the wrong Secret key

- **Symptom:** The backend crashed with `Invalid URI scheme`.
- **Root cause:** `MONGO_URI` was filled from the `mongo-root-username` key, so its value was just `root`. The URI host also has to be the real Service name, which is `mongodb-service`.
- **Fix:** Build the URI from the username and password variables. The `$(VAR)` references must be defined earlier in the same `env` list:

  ```yaml
  - name: MONGO_URI
    value: "mongodb://$(MONGO_ROOT_USERNAME):$(MONGO_ROOT_PASSWORD)@mongodb-service:27017/task_manager?authSource=admin"
  ```

  Also set `DATABASE_NAME`, which the Compose file had.

#### Error 24: `ImagePullBackOff` with local images

- **Symptom:** Pods using `kube-backend:latest` or `kube-frontend:latest` could not pull their image.
- **Root cause:** With the `:latest` tag, Kubernetes defaults to `imagePullPolicy: Always` and tries Docker Hub, where a local image does not exist.
- **Fix:** Set `imagePullPolicy: IfNotPresent`. On kind or minikube, the image must also be loaded into the cluster. For a real deployment, push the images to a registry.

#### Error 25: `ImagePullBackOff` caused by a tag typo

- **Symptom:** `pull access denied, repository does not exist or may require authorization` for `kube-frontend:k8sS`.
- **Root cause:** The Deployment had an extra capital `S` in the tag. The image built was `kube-frontend:k8s`, and tags are case-sensitive. The "access denied" message is misleading, because the registry simply has no such image.
- **Fix:** Correct the tag and apply the file, or run `kubectl set image deployment/frontend frontend=kube-frontend:k8s -n task-manager`. List the images in use with `kubectl get deploy -n task-manager -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image`.

#### Error 26: Ingress with the wrong port, a rewrite rule and an unusable host

- **Symptom:** API calls through the Ingress failed with errors from the controller.
- **Root cause:** Three problems in `ingress.yaml`: the backend rule used port 8080 while `backend-service` listens on 8000; the annotation `rewrite-target: /` rewrote every matched path (including `/api/tasks`) to `/`; and the host `myapp.com` does not resolve on a local machine.
- **Fix:** Use port 8000, remove the rewrite annotation (the backend routes already start with `/api`), and drop the `host:` so the Ingress answers on `http://localhost`.

#### Error 27: The frontend still calls the old API address

- **Symptom:** The page loaded but showed "Could not connect to the backend".
- **Root cause:** `REACT_APP_API_URL` is baked into the JavaScript at build time. The image built for Docker Compose called `http://localhost:8000`, which nothing serves behind the Ingress. The code also falls back to `localhost:8000` when the variable is empty, so an empty value does not work.
- **Fix:** Rebuild with the Ingress address and a separate tag, so a later `docker compose up --build` cannot overwrite it:

  ```bash
  docker build -t kube-frontend:k8s --build-arg REACT_APP_API_URL=http://localhost ./frontend
  ```

  Pass the project folder (`./frontend`) as the build context, not a file inside it.

### Controller and probe errors

#### Error 28: Choosing an ingress controller

- **Symptom:** The installation guide recommended the ingress-nginx controller, but the Kubernetes documentation now recommends Gateway API over Ingress.
- **Root cause:** Two separate things. The Ingress API is frozen (still supported, no new features). The ingress-nginx controller project was retired in March 2026, so it gets no security updates.
- **Fix:** For a local learning project, the retired controller still works (use the current release from its installation guide, and install it with the manifest that creates its own namespace). For anything public, use a maintained controller or a Gateway API implementation. Both approaches need the same frontend rebuild (Error 27).

#### Error 29: Pods restart or stay `0/1` on a slow node

- **Symptom:** The backend was `0/1` with `Exit Code: 137`, the frontend had 10 restarts, and the events showed `Readiness probe failed: context deadline exceeded` and `failed to sync secret cache: timed out waiting for the condition`.
- **Root cause:** Probes default to `timeoutSeconds: 1`, and a slow node cannot answer in time. After repeated liveness failures the kubelet kills the container (exit code 137, reason `Error`, not `OOMKilled`). The readiness check `/health` also waits on MongoDB, and pymongo's default server-selection timeout is 30 seconds, much longer than the probe. The secret-cache timeout is the slow API server.
- **Fix:**
  1. Set explicit, generous probe timeouts (for the backend, 15 to 20 seconds with a higher failure threshold; 5 seconds for the frontend and MongoDB).
  2. Make the database check fail fast: `MongoClient(uri, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000)`.
  3. Use `/health/live` for liveness and `/health` for readiness.
  4. Sometimes the pod simply recovers once the node catches up: `kubectl get pods -n task-manager -w`.

### Monitoring errors

#### Error 30: Monitoring Ingress across namespaces, with wrong ports and sub-paths

- **Symptom:** Adding `/grafana` and `/prometheus` rules to the application Ingress would not work.
- **Root cause:** An Ingress can only reference Services in its own namespace, and Grafana and Prometheus are in `monitoring`. The Service ports are 80 (3001 and 9090 were only the local sides of port-forwards). Both tools also expect to run at `/`, so a sub-path needs extra application settings. Mixing a host name with a sub-path (`grafana.localhost` and `/grafana`) fails for the same reason.
- **Fix:** Create a separate Ingress in the `monitoring` namespace with host rules (`grafana.localhost` and `prometheus.localhost`, both with path `/` and port 80), and set `grafana.ini` `root_url` to `http://grafana.localhost/`. If sub-paths are wanted instead, set `serve_from_sub_path` and `root_url` for Grafana, and `prefixURL` and `baseURL` for Prometheus.

#### Error 31: `kube-prometheus-stack` install fails

- **Symptom:** `INSTALLATION FAILED: failed to install CRD crds/crd-prometheusagents.yaml ... http2: client connection lost`. Only four of the ten custom resource types had been created, and a manual `kubectl apply` then failed with `TLS handshake timeout`.
- **Root cause:** The chart installs large CRD files, and the API server of an overloaded cluster dropped the connection part-way. The values were not at fault.
- **Fix:** Check `kubectl get nodes` and `docker info` for memory. On a small machine, use the lightweight `prometheus` chart instead (no operator, no CRDs; see [Monitoring on Kubernetes](#monitoring-on-kubernetes)), and delete the leftover CRDs (`kubectl get crd | findstr coreos`, then `kubectl delete crd <name>`). The full stack is kept in `kubernetes/monitoring/full-stack/` for a larger machine.

#### Error 32: `helm upgrade` fails with timeouts

- **Symptom:** `kubernetes cluster unreachable ... TLS handshake timeout`, then `create: failed to create: Timeout: request did not complete within requested timeout`.
- **Root cause:** The API server was too slow to answer. Nothing was applied, and `helm history` showed only the earlier `deployed` revision.
- **Fix:** Check `helm history <release> -n monitoring` (a `pending-upgrade` status needs a `helm rollback`). Reduce the load (`kubectl scale deployment --all --replicas=0 -n task-manager`), wait until `kubectl get nodes` answers quickly, then retry with `--timeout 10m`.

#### Error 33: Prometheus targets DOWN for the API server and kube-state-metrics

- **Symptom:** `kubernetes-api-servers` was down with `context deadline exceeded` (after 20 seconds), and two `kube-state-metrics` targets were down with `connection refused`. The control-plane kubelet returned `401 Unauthorized`.
- **Root cause:** The API server's metrics output is large and the cluster was too slow to produce it before the timeout. `kube-state-metrics` kept restarting under load, so nothing was listening. Neither is needed for application monitoring.
- **Fix:** In `prometheus-values.yaml`, set `kube-state-metrics: enabled: false` and replace the default scrape jobs with a short list through `serverFiles` (a list in Helm values replaces the default rather than merging). Then run `helm upgrade ... -f`. Compare with the defaults using `helm show values prometheus-community/prometheus`.

#### Error 34: Disabled components come back after an upgrade

- **Symptom:** The Targets page again listed `kube-state-metrics`, `prometheus-node-exporter`, and the default `kubernetes-nodes` and `kubernetes-service-endpoints` jobs, with the default 10-second timeout.
- **Root cause (likely):** The release was upgraded without the values file, or with a different one. Helm resets every setting that is not passed to the chart default.
- **Fix:** Check with `helm get values prometheus -n monitoring`, then re-apply `helm upgrade prometheus prometheus-community/prometheus -n monitoring -f kubernetes/monitoring/lite/prometheus-values.yaml`. Always pass `-f`.

#### Error 35: Prometheus server in `CrashLoopBackOff` after a configuration change

- **Symptom:** The `prometheus-server` pod kept restarting.
- **Root cause:** The generated Prometheus configuration contained a duplicated section, so Prometheus refused to start. The configuration lives in the `prometheus-server` ConfigMap, which Helm builds from the values file. The crash message names the problem (for example, a duplicate `job_name`): `kubectl logs <pod> -c prometheus-server -n monitoring --previous`.
- **Fix:** Remove the duplicate from the values file, delete the generated ConfigMap, and run `helm upgrade ... -f ... --force` so Helm recreates it. The values file is the source of truth, so a manual edit in the cluster is lost at the next upgrade. Preview before applying with `helm upgrade ... --dry-run` or `helm template`.

#### Error 36: Grafana restarts repeatedly and stays `0/1`

- **Symptom:** The Grafana pod showed 28 restarts in about 3 hours and `0/1` readiness.
- **Root cause:** On a slow node Grafana takes a long time to start, and a tight memory limit (256Mi) or the default probe timeouts can kill it before it is ready. Check with `kubectl describe pod` (`Last State` and `Reason`) and `kubectl logs --previous`.
- **Fix:** Raise the memory limit (for example to 512Mi), and set patient probes in `grafana-values.yaml` (long `initialDelaySeconds` and `timeoutSeconds`). Confirm the keys with `helm show values grafana-community/grafana`, then run `helm upgrade`. If the VM is full, stop Grafana (`kubectl scale deployment grafana --replicas=0 -n monitoring`) and use Prometheus' own interface.

### Tooling errors

#### Error 37: Commands fail from the wrong folder or on the wrong path

- **Symptom:** `Cannot find path 'C:\WINDOWS\system32\...'`; `helm install ...: open kubernetes/monitoring/lite/prometheus-values.yaml: The system cannot find the path specified`; and a `docker build` that ended with a file path.
- **Root cause:** PowerShell opened in `C:\WINDOWS\System32` resolves relative paths from there. The values file also did not exist yet, because the downloaded file had not been saved into the project folder. `docker build` needs a folder (the build context), not a file such as `./frontend/src/App.jsx`.
- **Fix:** `cd` to the project folder before any command with a relative path, and check files with `Get-ChildItem kubernetes -Recurse`. Pass `./frontend` to `docker build`. Do not run a normal work session as Administrator.

#### Error 38: Git reports an unresolved conflict, and ignore rules were wrong

- **Symptom:** `fatal: Exiting because of an unresolved conflict.`
- **Root cause:** The same file (such as `README.md` or `.gitignore`) existed on GitHub and locally with different content, and Git could not merge the two automatically. The first `.gitignore` also ignored a Compose file by the wrong extension and did not ignore `node_modules/` or `.env`.
- **Fix:** Run `git status`, open each conflicted file and keep the right lines (removing the `<<<<<<<`, `=======` and `>>>>>>>` markers), then `git add` the files and commit (or `git rebase --continue`). Check with `git grep -n "<<<<<<<"`. Use `git merge --abort` to start over. Keep `node_modules/`, `.env` and caches in `.gitignore`, and untrack files already committed with `git rm --cached`.

### Root cause

#### Error 39: Hardware limits are the root cause of the instability

- **Symptom:** Many unrelated errors: `TLS handshake timeout`, `http2: client connection lost`, `EOF` from kubectl, Helm timeouts, probe failures, and unexplained pod restarts.
- **Root cause:** The machine has 8 GB of RAM. The Docker VM had 3.8 GiB, shared by a three-node Kubernetes cluster (each node runs its own kubelet and runtime), the application, an ingress controller and the monitoring stack. The API server was the first thing to stall. Waiting often fixed it, because nothing was actually misconfigured.
- **Fix and mitigation:**
  1. Check `docker info` for CPUs and total memory, and raise the VM in `C:\Users\<name>\.wslconfig` if the machine allows (`memory=5GB`, `swap=4GB`, then `wsl --shutdown`).
  2. Use a single-node cluster if Docker Desktop offers it (resetting the cluster deletes everything in it, and the YAML files rebuild it).
  3. Start in stages: the application first, monitoring second. Scale workloads down (`kubectl scale deployment --all --replicas=0 -n <namespace>`) before heavy operations.
  4. Use lightweight monitoring (`kubernetes/monitoring/lite/`) and make probes patient.
  5. Run the full monitoring stack on a larger machine or a remote server.

## Quick Troubleshooting Reference

| Problem | Check |
|---|---|
| A container is `unhealthy` | `docker inspect --format='{{json .State.Health}}' <container>` shows each check's real output |
| A container keeps restarting | `docker logs --tail 50 <container>` |
| Compose file rejected | `docker compose config --quiet`, and check indentation |
| Wrong environment value | `docker compose config` shows the resolved values |
| Frontend cannot reach the API | Browser dev tools → Network tab, and check CORS origins |
| Prometheus target down | `http://localhost:9090/targets` shows the exact scrape error |
| Grafana has no data | Explore → run `up`, and check the data source URL is `http://prometheus:9090` |
| Config change not applied | Recreate the service: `docker compose up -d --force-recreate <service>` |
| Need container CPU and memory quickly | `docker stats --no-stream` |
| Pod not ready or restarting | `kubectl describe pod <pod> -n <namespace>` (read the Events), and `kubectl logs <pod> --previous` |
| Pod cannot pull its image | Compare `docker images` with `kubectl get deploy -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image` |
| Service has no backend | `kubectl get endpoints -n <namespace>` (an empty list means no ready pod) |
| Ingress returns 404, 502 or 503 | `kubectl describe ingress -n <namespace>` and check the Service name, port and namespace |
| Helm release is stuck | `helm history <release> -n <namespace>` and `helm rollback` |
| Helm reset my settings | Always pass `-f values.yaml`, and check with `helm get values <release>` |
| kubectl or Helm times out | Check `kubectl get nodes` and `docker stats`, reduce the load, then retry once |

### Stop the services

```bash
docker compose down
```

This stops and removes the Compose containers and network while preserving named volumes.

**Avoid `docker compose down -v`** unless you intentionally want to delete the named persistent volumes and their stored data.

## Project Roadmap

- [x] Build the React frontend and FastAPI backend.
- [x] Containerize the application services.
- [x] Define the multi-container deployment using Docker Compose.
- [x] Add MongoDB and Mongo Express.
- [x] Add cAdvisor, Prometheus, and Grafana configuration.
- [x] Verify that MongoDB starts and passes its health check.
- [x] Connect Grafana to Prometheus.
- [x] Add application-level metrics (FastAPI) and database metrics (MongoDB exporter).
- [x] Migrate the application to Kubernetes.
- [x] Deploy the application using Kubernetes Deployments and Services.
- [x] Configure Kubernetes health probes (liveness on `/health/live`, readiness on `/health`) and persistent storage.
- [x] Route traffic with an Ingress.
- [x] Extend monitoring to the Kubernetes environment (lightweight Prometheus and Grafana with Helm).
- [x] Document every error and fix.
- [ ] Build Grafana dashboards for application and database metrics.
- [ ] Add alerting rules.
- [ ] Add a CI/CD pipeline that builds and pushes the images.
- [ ] Deploy to a remote server (k3s or Docker Compose with HTTPS).
- [ ] Run the full `kube-prometheus-stack` on a machine with more memory.
- [ ] Move to a maintained ingress controller or Gateway API.

## Learning Outcomes

This project is intended to demonstrate practical experience with:

- Multi-stage Docker builds and understanding the Docker build context.
- Docker networking and service discovery.
- Docker Compose orchestration and dependency health checks.
- Persistent storage using Docker volumes.
- REST API deployment, CORS, and database integration.
- Infrastructure and application monitoring with cAdvisor, FastAPI instrumentation, exporters, and Prometheus.
- Grafana dashboards and metric queries.
- Troubleshooting container lifecycle, credentials, and service connectivity.
- Diagnosing resource limits on a Docker Desktop host.
- Writing Kubernetes manifests: Namespaces, Deployments, Services, Secrets, PersistentVolumeClaims, probes and Ingress.
- Debugging Kubernetes with `kubectl describe`, logs, and Events (`ImagePullBackOff`, `CrashLoopBackOff`, readiness failures).
- Packaging and configuring software with Helm charts and values files.
- Understanding the difference between liveness and readiness probes.
- Recognizing resource exhaustion as the cause of API server timeouts and flapping pods.
- Keeping documentation current as a runbook.

## Security Notes

This is a learning project, not a production-ready deployment.

- Replace example passwords with strong credentials, and keep them identical across every service that connects to MongoDB.
- Do not commit secrets or populated `.env` files to Git.
- Avoid exposing MongoDB, Mongo Express, Prometheus, cAdvisor, or Grafana publicly without appropriate access controls.
- Remove the `27017:27017` mapping if nothing outside Docker needs direct database access.
- cAdvisor runs as a privileged container with host paths mounted. Review container privileges and mounted host paths before deploying outside a local development environment.
- Passwords containing characters such as `@`, `:`, `/`, or `?` must be URL-encoded in `MONGO_URI`.
- `kubernetes/secret.yaml` contains base64-encoded learning credentials (`root` / `password`). Base64 is encoding, not encryption, so these values must never be reused. For real deployments, create secrets with `kubectl create secret` or use a secrets manager, and do not commit them.
- Prometheus has no authentication. Keep it, Grafana, and MongoDB off the public internet, and reach them through an SSH tunnel or behind a login.
- The ingress-nginx controller used here is retired and receives no security fixes. Use a maintained controller outside local development.
- Change the Grafana admin password in `grafana-values.yaml` before sharing the setup.

## Author

**Your Name**

- GitHub: [Your GitHub Profile](https://github.com/your-username)
- LinkedIn: [Your LinkedIn Profile](https://www.linkedin.com/in/your-profile/)

---

*Built as a hands-on infrastructure learning project, progressing from Docker Compose to Kubernetes with monitoring and observability.*