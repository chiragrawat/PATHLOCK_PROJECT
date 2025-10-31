import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';

// Configuration
const API_BASE_URL = 'https://proj1-basictaskmanager-backend.onrender.com'//!! UPDATE THIS to your backend port

// Type definition
type Task = {
  id: string;
  description: string;
  isCompleted: boolean;
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch all tasks from API on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/tasks`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Task[] = await response.json();
        setTasks(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch tasks.');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // 2. Handle adding a new task
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) {
      setError('Task description cannot be empty.');
      return;
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newTaskDesc }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newTask: Task = await response.json();
      setTasks([...tasks, newTask]);
      setNewTaskDesc('');
    } catch (err: any) {
      setError(err.message || 'Failed to add task.');
    }
  };

  // 3. Handle toggling a task's completion status
  const handleToggleTask = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'PUT',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to toggle task.');
    }
  };

  // 4. Handle deleting a task
  const handleDeleteTask = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-gray-800 shadow-xl rounded-lg p-6">
          <h1 className="text-3xl font-bold text-center text-white mb-6">
            Basic Task Manager
          </h1>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg my-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {/* Add Task Form */}
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="Add a new task..."
              className="flex-grow px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-200 flex-shrink-0"
            >
              Add
            </button>
          </form>

          {/* Task List */}
          <div className="space-y-3">
            {loading && <p className="text-gray-400 text-center">Loading tasks...</p>}
            
            {!loading && tasks.length === 0 && (
              <p className="text-gray-400 text-center">No tasks yet. Add one above!</p>
            )}

            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between bg-gray-700 p-4 rounded-lg group"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => handleToggleTask(task.id)}
                >
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    readOnly
                    className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span
                    className={`text-white ${
                      task.isCompleted ? 'line-through text-gray-500' : ''
                    }`}
                  >
                    {task.description}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-500 hover:text-red-500 text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete task"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
