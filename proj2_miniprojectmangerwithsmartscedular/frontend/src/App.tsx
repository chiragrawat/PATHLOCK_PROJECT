import  { 
  useState, 
  useEffect, 
  createContext, 
  useContext, 
  useMemo,
  useCallback 
} from 'react';
// We need these for type-only imports
import type { FormEvent, ReactNode } from 'react';

// --- CONFIGURATION ---
// !! Make sure this port matches your backend (it was 5119 in your logs)
const API_BASE_URL = 'https://pathlock-project-1.onrender.com/api'; 
const TOKEN_KEY = 'mini-pm-token';
const EMAIL_KEY = 'mini-pm-email'; 

// --- TYPE DEFINITIONS ---
type Task = {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
  projectId: string; 
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  creationDate: string;
  taskCount: number;
  completedTaskCount: number;
};

type ProjectDetail = Project & {
  tasks: Task[];
};

type AuthResponse = {
  token: string;
  email: string;
};

type SchedulerTaskInput = {
  title: string;
  estimatedHours: number;
  dueDate: string | null;
  dependencies: string[];
};



const apiClient = {
  request: async (method: string, endpoint: string, data?: any) => {
   
    const token = localStorage.getItem(TOKEN_KEY);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

   
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        if (response.status === 401) {
         
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(EMAIL_KEY);
          // Reload to force user back to login
          window.location.href = '/auth'; 
        }

       
        try {
          const errData = await response.json();
          // Use 'title' if it's a validation problem (ASP.NET standard)
          console.error('API Error Body:', errData);
          throw new Error(errData.title || errData.message || `HTTP error! status: ${response.status}`);
        } catch (jsonError) {
          // Fallback if body isn't JSON
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      // Handle 204 No Content (for DELETE requests)
      if (response.status === 204) {
        return null;
      }

      return await response.json();

    } catch (error: any) {
      console.error("API Client Error:", error.message);
      // Re-throw the error so the component's catch block can handle it
      throw error; 
    }
  },

  // 3. Simplified methods no longer need the token passed in
  get: (endpoint: string) => apiClient.request('GET', endpoint),
  post: (endpoint: string, data: any) => apiClient.request('POST', endpoint, data),
  put: (endpoint: string, data: any) => apiClient.request('PUT', endpoint, data),
  del: (endpoint: string) => apiClient.request('DELETE', endpoint),
};


// --- AUTHENTICATION CONTEXT (IMPROVED) ---

type AuthContextType = {
  isAuthenticated: boolean;
  email: string | null;
  isLoading: boolean; // <-- NEW: Prevents flicker on load
  login: (token: string, email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state

  useEffect(() => {
    // On app load, check localStorage
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedEmail = localStorage.getItem(EMAIL_KEY);
      if (storedToken) {
        setToken(storedToken);
        setEmail(storedEmail);
      }
    } catch (e) {
      console.error("Failed to load auth from storage", e);
    }
    // Finished loading auth state
    setIsLoading(false); 
  }, []);

  const login = (newToken: string, newEmail: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(EMAIL_KEY, newEmail);
      setToken(newToken);
      setEmail(newEmail);
    } catch (e) {
      console.error("Failed to save auth to storage", e);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
      setToken(null);
      setEmail(null);
    } catch (e) {
      console.error("Failed to clear auth from storage", e);
    }
  };

  const value = useMemo(() => ({
    isAuthenticated: !!token,
    email,
    isLoading,
    login,
    logout,
  }), [token, email, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- ROUTER & APP ---

const App = () => {
  // --- EDIT: Set document title ---
  useEffect(() => {
    document.title = "Mini PM";
  }, []);
  // --- End Edit ---

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
        <Router />
      </div>
    </AuthProvider>
  );
};

const Router = () => {
  const [page, setPage] = useState(window.location.pathname);
  const auth = useAuth();

  // Handle browser navigation (back/forward)
  useEffect(() => {
    const onLocationChange = () => setPage(window.location.pathname);
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  // Handle programmatic navigation
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setPage(path);
  };

  // --- Protected Route Logic ---
  // This useEffect handles routing rules
  useEffect(() => {
    if (auth.isLoading) {
      return; // Wait until auth state is loaded
    }
    
    const isAuthPage = page === '/auth';
    
    if (isAuthPage && auth.isAuthenticated) {
      // User is on /auth but is logged in. Redirect to dashboard.
      navigate('/dashboard');
    } else if (!isAuthPage && !auth.isAuthenticated) {
      // User is on a protected page but is NOT logged in. Redirect to auth.
      navigate('/auth');
    }
  }, [page, auth.isAuthenticated, auth.isLoading]); // Rerun when auth state changes

  // This prevents the "flicker" of the login page when already logged in
  if (auth.isLoading) {
    return <LoadingSpinner text="Loading session..." />;
  }

  // --- Page Rendering ---
  let content = null;
  if (page.startsWith('/projects/')) {
    const id = page.split('/')[2];
    content = <ProjectDetailPage projectId={id} onNavigate={navigate} />;
  } else {
    switch (page) {
      case '/auth':
        content = <AuthPage onNavigate={navigate} />;
        break;
      case '/dashboard':
      default:
        content = <DashboardPage onNavigate={navigate} />;
        break;
    }
  }

  return (
    <>
      {auth.isAuthenticated && <Header onNavigate={navigate} />}
      <main className="max-w-7xl mx-auto p-4 md:p-8">{content}</main>
    </>
  );
};

// --- SHARED COMPONENTS ---

const Header = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const auth = useAuth();

  const handleLogout = () => {
    auth.logout();
    onNavigate('/auth'); // Navigate after logout
  };

  return (
    <header className="bg-gray-800 shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="text-2xl font-bold text-white cursor-pointer hover:text-indigo-400"
            onClick={() => onNavigate('/dashboard')}
          >
            MiniPM
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm hidden sm:block">{auth.email}</span>
            <button
              onClick={handleLogout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

const LoadingSpinner = ({ text = 'Loading...' }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-gray-400">
    <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>{text}</span>
  </div>
);

const ErrorDisplay = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg my-4" role="alert">
      <strong className="font-bold">Error: </strong>
      <span className="block sm:inline">{message}</span>
    </div>
  );
};

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: ReactNode }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Base styles for inputs and buttons
const inputStyle = "w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
// --- EDIT: Removed w-full from base btnStyle ---
const btnStyle = "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75";

// --- AUTH PAGE ---

const AuthPage = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    
    try {
      const data: AuthResponse = await apiClient.post(endpoint, { email, password });
      auth.login(data.token, data.email);
      onNavigate('/dashboard'); // Navigate on success
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-white">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-300 block mb-2"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyle}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-300 block mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyle}
              placeholder="••••••••"
              required
            />
          </div>
          <ErrorDisplay message={error} />
          <div>
            {/* --- EDIT: Added w-full --- */}
            <button
              type="submit"
              className={`${btnStyle} w-full disabled:opacity-50`}
              disabled={isLoading}
            >
              {isLoading ? (isLogin ? 'Logging in...' : 'Registering...') : (isLogin ? 'Login' : 'Register')}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-400">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="font-medium text-indigo-400 hover:text-indigo-300 ml-1"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};

// --- DASHBOARD PAGE ---

const DashboardPage = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  // --- EDIT: Add state for description ---
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // No token needed here, apiClient handles it
      const data: Project[] = await apiClient.get('/projects');
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    setError(null);
    try {
      // --- EDIT: Send title and description ---
      const newProject: Project = await apiClient.post('/projects', {
        title: newProjectTitle,
        description: newProjectDescription,
      });
      setProjects([newProject, ...projects]); // Add to top of list
      setNewProjectTitle('');
      setNewProjectDescription(''); // --- EDIT: Reset description ---
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    }
  };

  const handleDeleteProject = async (id: string) => {
    // Use a custom modal confirm instead of window.confirm
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }
    
    setError(null);
    try {
      await apiClient.del(`/projects/${id}`);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete project.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading projects..." />;
  }
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Your Projects</h1>
      
      {/* Create Project Form */}
      <form onSubmit={handleCreateProject} className="bg-gray-800 p-6 rounded-lg shadow-xl space-y-4">
        <h2 className="text-xl font-semibold text-white">Create a New Project</h2>
        <ErrorDisplay message={error} />
        <div>
          <label htmlFor="project-title" className="sr-only">Project Title</label>
          <input
            id="project-title"
            value={newProjectTitle}
            onChange={(e) => setNewProjectTitle(e.target.value)}
            className={inputStyle}
            placeholder="New project title... (Required)"
            required // --- EDIT: Add required ---
          />
        </div>
        {/* --- EDIT: Add Description Textarea --- */}
        <div>
          <label htmlFor="project-description" className="sr-only">Project Description</label>
          <textarea
            id="project-description"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            className={`${inputStyle} h-24 resize-none`}
            placeholder="Project description... (Optional)"
            maxLength={500} // --- EDIT: Add max length ---
          />
        </div>
        {/* --- EDIT: Added icon and flex styles to button, and w-full --- */}
        <button type="submit" className={`${btnStyle} w-full flex items-center justify-center gap-2`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create Project
        </button>
      </form>
      
      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 && !isLoading && (
          <p className="text-gray-400 col-span-full text-center">You don't have any projects yet.</p>
        )}
        
        {projects.map(project => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onNavigate={onNavigate}
            onDelete={handleDeleteProject}
          />
        ))}
      </div>
    </div>
  );
};

const ProjectCard = ({ 
  project, 
  onNavigate,
  onDelete
}: { 
  project: Project, 
  onNavigate: (path: string) => void,
  onDelete: (id: string) => void
}) => {
  const progress = project.taskCount > 0 
    ? (project.completedTaskCount / project.taskCount) * 100 
    : 0;
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col transition duration-300 hover:shadow-indigo-500/30 hover:border-gray-600 border border-transparent">
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start">
          <h3 
            className="text-xl font-semibold text-white mb-2 cursor-pointer hover:text-indigo-400"
            onClick={() => onNavigate(`/projects/${project.id}`)}
          >
            {project.title}
          </h3>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            className="text-gray-500 hover:text-red-500 text-lg"
            title="Delete project"
          >
            &times;
          </button>
        </div>
        {/* --- EDIT: Display description --- */}
        {project.description && (
          <p className="text-gray-400 text-sm mb-4 h-10 overflow-hidden text-ellipsis">
            {project.description}
          </p>
        )}
        <p className="text-gray-400 text-sm mb-4">
          Created: {new Date(project.creationDate).toLocaleDateString()}
        </p>
        
        <div className="text-sm text-gray-300">
          <p>{project.taskCount} tasks ({project.completedTaskCount} completed)</p>
        </div>
      </div>
      <div className="px-6 pb-6">
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-indigo-500 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-right text-xs text-gray-400 mt-1">{Math.round(progress)}% complete</p>
      </div>
    </div>
  );
};


// --- PROJECT DETAIL PAGE ---

const ProjectDetailPage = ({ projectId, onNavigate }: { projectId: string, onNavigate: (path: string) => void }) => {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  // --- EDIT: Add state for due date ---
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: ProjectDetail = await apiClient.get(`/projects/${projectId}`);
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project details.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !project) return;
    
    setError(null);
    try {
      // --- EDIT: Send title and due date ---
      const newTask: Task = await apiClient.post(`/projects/${project.id}/tasks`, {
        title: newTaskTitle,
        dueDate: newTaskDueDate || null, // Send null if empty
      });
      // --- EDIT: Add projectId to the new task object in state ---
      setProject({
        ...project,
        tasks: [...project.tasks, { ...newTask, projectId: project.id }]
      });
      setNewTaskTitle('');
      setNewTaskDueDate(''); // --- EDIT: Reset due date ---
    } catch (err: any) {
      setError(err.message || 'Failed to add task.');
    }
  };

  const handleToggleTask = async (task: Task) => {
    if (!project) return;
    
    const updatedTask = { ...task, isCompleted: !task.isCompleted };
    
    // Optimistic UI update
    setProject({
      ...project,
      tasks: project.tasks.map(t => t.id === task.id ? updatedTask : t)
    });

    try {
      // Send all fields required by UpdateTaskDto
      await apiClient.put(`/tasks/${task.id}`, {
        title: updatedTask.title,
        dueDate: updatedTask.dueDate,
        isCompleted: updatedTask.isCompleted,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update task.');
      // Revert on error
      setProject({
        ...project,
        tasks: project.tasks.map(t => t.id === task.id ? task : t)
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!project) return;
    
    // Use a custom modal confirm instead of window.confirm
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }
    
    const originalTasks = project.tasks;
    setProject({
      ...project,
      tasks: project.tasks.filter(t => t.id !== taskId)
    });

    try {
      await apiClient.del(`/tasks/${taskId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete task.');
      // Revert on error
      setProject({ ...project, tasks: originalTasks });
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading project details..." />;
  }

  if (error && !project) {
    return <ErrorDisplay message={error} />;
  }
  
  if (!project) {
    return <p className="text-gray-400">Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => onNavigate('/dashboard')}
        className="text-indigo-400 hover:text-indigo-300 text-sm"
      >
        &larr; Back to all projects
      </button>
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">{project.title}</h1>
        {/* --- EDIT: Added w-full and md:w-auto for responsive size --- */}
        <button
          onClick={() => setIsSchedulerOpen(true)}
          className={`${btnStyle} w-full md:w-auto`}
        >
          Smart Scheduler
        </button>
      </div>
      
      {project.description && (
        <p className="text-gray-300 text-lg">{project.description}</p>
      )}

      <ErrorDisplay message={error} />

      {/* --- EDIT: Updated Add Task Form --- */}
      <form onSubmit={handleAddTask} className="space-y-4 md:space-y-0 md:flex md:gap-4">
        <div className="flex-grow">
          <label htmlFor="task-title" className="sr-only">Task Title</label>
          <input
            id="task-title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className={inputStyle}
            placeholder="Add a new task... (Required)"
            required
          />
        </div>
        <div className="w-full md:w-auto">
          <label htmlFor="task-due-date" className="sr-only">Due Date</label>
          <input
            id="task-due-date"
            type="date"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
            className={`${inputStyle} text-gray-400`}
            title="Optional due date"
          />
        </div>
        {/* --- EDIT: Added icon and flex styles to button, and w-full md:w-auto --- */}
        <button type="submit" className={`${btnStyle} w-full md:w-auto flex items-center justify-center gap-2`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Add Task
        </button>
      </form>

      {/* Task List */}
      <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <ul className="divide-y divide-gray-700">
          {project.tasks.length === 0 && (
            <li className="p-4 text-gray-400 text-center">No tasks for this project yet.</li>
          )}
          {project.tasks.map(task => (
            <li key={task.id} className="flex items-center justify-between p-4 group hover:bg-gray-700/50">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={() => handleToggleTask(task)}
                  className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className={`text-white ${task.isCompleted ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </span>
                  {/* --- EDIT: Display Due Date --- */}
                  {task.dueDate && (
                    <span className={`text-xs ${task.isCompleted ? 'text-gray-600 line-through' : 'text-indigo-300'}`}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="text-gray-500 hover:text-red-500 text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete task"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      </div>

      {isSchedulerOpen && (
        <SchedulerModal
          projectId={project.id}
          onClose={() => setIsSchedulerOpen(false)}
        />
      )}
    </div>
  );
};

// --- SCHEDULER MODAL ---

const SchedulerModal = ({ projectId, onClose }: { projectId: string, onClose: () => void }) => {
  const [schedulerTasks, setSchedulerTasks] = useState<SchedulerTaskInput[]>([
    { title: '', estimatedHours: 0, dueDate: null, dependencies: [] }
  ]);
  const [recommendedOrder, setRecommendedOrder] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTaskChange = (index: number, field: keyof SchedulerTaskInput, value: any) => {
    const newTasks = [...schedulerTasks];
    if (field === 'dependencies') {
      newTasks[index][field] = value.split(',').map((s: string) => s.trim()).filter(Boolean);
    } else if (field === 'estimatedHours') {
      newTasks[index][field] = parseInt(value, 10) || 0;
    } else {
      (newTasks[index] as any)[field] = value;
    }
    setSchedulerTasks(newTasks);
  };

  const addTaskField = () => {
    setSchedulerTasks([...schedulerTasks, { title: '', estimatedHours: 0, dueDate: null, dependencies: [] }]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendedOrder([]);

    // Filter out tasks without titles before sending
    const validTasks = schedulerTasks.filter(t => t.title.trim() !== '');

    try {
      const result = await apiClient.post(`/v1/projects/${projectId}/schedule`, { tasks: validTasks });
      setRecommendedOrder(result.recommendedOrder);
    } catch (err: any) {
      setError(err.message || 'Failed to generate schedule.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal title="Smart Scheduler" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-gray-300 text-sm">
          Define tasks to get a recommended work order based on dependencies.
        </p>
        
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {schedulerTasks.map((task, index) => (
            <div key={index} className="p-3 bg-gray-700 rounded-lg space-y-2">
              <input
                type="text"
                value={task.title}
                onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                className={inputStyle}
                placeholder="Task Title (e.g., 'Design API')"
                required
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={task.estimatedHours}
                  onChange={(e) => handleTaskChange(index, 'estimatedHours', e.target.value)}
                  className={`${inputStyle} w-1/2`}
                  placeholder="Est. Hours"
                />
                <input
                  type="date"
                  value={task.dueDate || ''}
                  onChange={(e) => handleTaskChange(index, 'dueDate', e.target.value || null)}
                  className={`${inputStyle} w-1/2 text-gray-400`}
                />
              </div>
              <input
                type="text"
                value={task.dependencies.join(', ')}
                onChange={(e) => handleTaskChange(index, 'dependencies', e.target.value)}
                className={inputStyle}
                placeholder="Dependencies (comma-separated, e.g., 'Build UI')"
              />
            </div>
          ))}
        </div>
        
        <button
          type="button"
          onClick={addTaskField}
          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
        >
          + Add another task
        </button>

        <ErrorDisplay message={error} />
        
        {/* --- EDIT: Added w-full --- */}
        <button
          type="submit"
          className={`${btnStyle} w-full disabled:opacity-50`}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate Schedule'}
        </button>
      </form>

      {recommendedOrder.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-white mb-2">Recommended Order:</h4>
          <ol className="list-decimal list-inside bg-gray-700 p-4 rounded-lg text-white space-y-1">
            {recommendedOrder.map((title, index) => (
              <li key={index}>{title}</li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  );
};

export default App;

