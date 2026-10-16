import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchTasks() {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/tasks`);

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      setTasks(await response.json());
    } catch (err) {
      console.error(err);
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function addTask(event) {
    event.preventDefault();

    if (!title.trim()) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!response.ok) throw new Error("Failed to add task");

      const task = await response.json();
      setTasks((previous) => [task, ...previous]);
      setTitle("");
    } catch (err) {
      console.error(err);
      setError("Could not add task.");
    }
  }

  async function toggleTask(task) {
    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${task._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !task.completed }),
        }
      );

      if (!response.ok) throw new Error("Failed to update task");

      const updated = await response.json();

      setTasks((previous) =>
        previous.map((item) =>
          item._id === updated._id ? updated : item
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not update task.");
    }
  }

  async function deleteTask(id) {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete task");

      setTasks((previous) =>
        previous.filter((task) => task._id !== id)
      );
    } catch (err) {
      console.error(err);
      setError("Could not delete task.");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Kubernetes Task Manager</h1>
        <p>React + FastAPI + MongoDB</p>
      </header>

      <main className="container">
        <section className="task-form-card">
          <h2>Add a Task</h2>

          <form className="task-form" onSubmit={addTask}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter a new task..."
              aria-label="Task title"
            />
            <button type="submit">Add Task</button>
          </form>
        </section>

        {error && <p className="error">{error}</p>}

        <section className="tasks-card">
          <div className="tasks-header">
            <h2>Tasks</h2>
            <span>{tasks.length} total</span>
          </div>

          {loading ? (
            <p className="message">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="message">
              {error
                ? "Start the backend to load your tasks."
                : "No tasks yet. Add your first task."}
            </p>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <div
                  className={`task ${task.completed ? "completed" : ""}`}
                  key={task._id}
                >
                  <label className="task-left">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                    />
                    <span>{task.title}</span>
                  </label>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteTask(task._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>Kubernetes Project 1</p>
      </footer>
    </div>
  );
}

export default App;
