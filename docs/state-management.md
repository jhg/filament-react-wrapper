# State Management

React Wrapper provides a powerful state management system with persistence, Livewire synchronization, and reactive updates across your Laravel application.

## 🎯 Overview

### What is State Management?

The state management system provides:
- **Global State** - Shared state across all components
- **Path-based Access** - Access nested state with dot notation
- **Persistence** - Save state to localStorage, sessionStorage, or server
- **Livewire Sync** - Two-way synchronization with Livewire components
- **Reactive Updates** - Automatic re-renders when state changes

### Key Features

- ✅ **Dot Notation Paths** - Access nested state easily (`user.profile.name`)
- ✅ **Multiple Storage Options** - localStorage, sessionStorage, memory, server
- ✅ **Livewire Integration** - Seamless two-way data binding
- ✅ **Type Safety** - Full TypeScript support with generics
- ✅ **Performance Optimized** - Selective re-renders and batched updates
- ✅ **DevTools Integration** - Debug state changes in real-time

## 🎛️ Global State Manager

### Basic Usage

```typescript
import { globalStateManager } from '@react-wrapper';

// Set state
globalStateManager.setState('user.name', 'John Doe');
globalStateManager.setState('user.email', 'john@example.com');

// Get state
const userName = globalStateManager.getState('user.name');
const user = globalStateManager.getState('user');

// Update state with function
globalStateManager.updateState('user.age', (currentAge) => currentAge + 1);

// Batch updates for performance
globalStateManager.batchUpdate([
  { path: 'user.name', value: 'Jane Doe' },
  { path: 'user.role', value: 'admin' },
  { path: 'settings.theme', value: 'dark' }
]);
```

### State Subscriptions

```typescript
// Subscribe to specific path changes
const unsubscribe = globalStateManager.subscribe('user.name', (newName) => {
  console.log('User name changed to:', newName);
});

// Subscribe to nested object changes
globalStateManager.subscribe('user', (user) => {
  console.log('User object updated:', user);
});

// Subscribe to all state changes
globalStateManager.subscribe('*', (state) => {
  console.log('Global state changed:', state);
});

// Cleanup subscription
unsubscribe();
```

## 🪝 React Hooks

### useStateManager Hook

Access the global state manager in any component:

```typescript
import React from 'react';
import { useStateManager } from '@react-wrapper';

const UserProfile: React.FC = () => {
  const { state, setState, getState, updateState } = useStateManager();
  
  const handleUpdateName = (newName: string) => {
    setState('user.name', newName);
  };
  
  const handleIncrementLoginCount = () => {
    updateState('user.loginCount', (count) => (count || 0) + 1);
  };
  
  return (
    <div>
      <h2>Welcome, {getState('user.name') || 'Guest'}</h2>
      <p>Login count: {getState('user.loginCount', 0)}</p>
      <button onClick={() => handleUpdateName('New Name')}>
        Update Name
      </button>
      <button onClick={handleIncrementLoginCount}>
        Increment Logins
      </button>
    </div>
  );
};
```

### useStatePath Hook

Direct access to specific state paths with automatic re-rendering:

```typescript
import React from 'react';
import { useStatePath } from '@react-wrapper';

const UserSettings: React.FC = () => {
  // Typed state path with default value
  const [theme, setTheme] = useStatePath<'light' | 'dark'>('settings.theme', 'light');
  const [notifications, setNotifications] = useStatePath('settings.notifications', true);
  const [language, setLanguage] = useStatePath('settings.language', 'en');
  
  return (
    <div className="settings-panel">
      <h3>User Settings</h3>
      
      <div className="setting-group">
        <label>Theme:</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      
      <div className="setting-group">
        <label>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          Enable Notifications
        </label>
      </div>
      
      <div className="setting-group">
        <label>Language:</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>
      </div>
    </div>
  );
};
```

### usePersistedState Hook

State that automatically persists to storage:

```typescript
import React from 'react';
import { usePersistedState } from '@react-wrapper';

interface UserPreferences {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  defaultView: string;
}

const Dashboard: React.FC = () => {
  // Persist to localStorage
  const [preferences, setPreferences] = usePersistedState<UserPreferences>(
    'userPreferences',
    {
      theme: 'light',
      sidebarCollapsed: false,
      defaultView: 'dashboard'
    },
    {
      storage: 'localStorage',
      syncWithLivewire: true,
      livewirePath: 'user.preferences'
    }
  );
  
  // Persist to sessionStorage
  const [currentTab, setCurrentTab] = usePersistedState(
    'currentTab',
    'overview',
    { storage: 'sessionStorage' }
  );
  
  const toggleSidebar = () => {
    setPreferences(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }));
  };
  
  const switchTheme = () => {
    setPreferences(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light'
    }));
  };
  
  return (
    <div className={`dashboard ${preferences.theme}`}>
      <header>
        <button onClick={toggleSidebar}>
          {preferences.sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
        </button>
        <button onClick={switchTheme}>
          Switch to {preferences.theme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
      </header>
      
      <nav className={preferences.sidebarCollapsed ? 'collapsed' : ''}>
        {/* Sidebar content */}
      </nav>
      
      <main>
        <div className="tab-navigation">
          {['overview', 'analytics', 'settings'].map(tab => (
            <button
              key={tab}
              className={currentTab === tab ? 'active' : ''}
              onClick={() => setCurrentTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="tab-content">
          {/* Tab content based on currentTab */}
        </div>
      </main>
    </div>
  );
};
```

## 🔄 State Persistence

### Configuration Options

```typescript
interface StatePersistenceConfig {
  storage: 'localStorage' | 'sessionStorage' | 'memory';
  syncWithLivewire: boolean;
  livewirePath: string;
  debounceMs: number;
  transformer: {
    serialize: (data: any) => string;
    deserialize: (data: string) => any;
  };
}
```

### Storage Strategies

#### Local Storage
```typescript
const [data, setData] = usePersistedState('myData', initialValue, {
  storage: 'localStorage' // Persists across browser sessions
});
```

#### Session Storage
```typescript
const [tempData, setTempData] = usePersistedState('tempData', initialValue, {
  storage: 'sessionStorage' // Persists until tab is closed
});
```

#### Memory Storage
```typescript
const [volatileData, setVolatileData] = usePersistedState('volatileData', initialValue, {
  storage: 'memory' // Lost on page refresh
});
```

### Custom Serialization

```typescript
const [complexData, setComplexData] = usePersistedState(
  'complexData',
  { date: new Date(), map: new Map() },
  {
    storage: 'localStorage',
    transformer: {
      serialize: (data) => {
        return JSON.stringify({
          ...data,
          date: data.date?.toISOString(),
          map: Array.from(data.map?.entries() || [])
        });
      },
      deserialize: (json) => {
        const data = JSON.parse(json);
        return {
          ...data,
          date: data.date ? new Date(data.date) : null,
          map: new Map(data.map || [])
        };
      }
    }
  }
);
```

## 🔗 Livewire Integration

### Two-Way Data Binding

```typescript
// React component synced with Livewire
const UserForm: React.FC = () => {
  const [formData, setFormData] = usePersistedState(
    'userForm',
    { name: '', email: '', role: '' },
    {
      syncWithLivewire: true,
      livewirePath: 'formData',
      debounceMs: 300 // Debounce updates to avoid excessive requests
    }
  );
  
  return (
    <form>
      <input
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        placeholder="Email"
      />
      <select
        value={formData.role}
        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
      >
        <option value="">Select Role</option>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    </form>
  );
};
```

```php
<?php
// Corresponding Livewire component
class UserForm extends Component
{
    public $formData = [
        'name' => '',
        'email' => '',
        'role' => ''
    ];
    
    public function render()
    {
        return view('livewire.user-form');
    }
    
    public function save()
    {
        $this->validate([
            'formData.name' => 'required|string',
            'formData.email' => 'required|email',
            'formData.role' => 'required|string'
        ]);
        
        User::create($this->formData);
        
        session()->flash('message', 'User created successfully!');
    }
}
```

### Real-time Updates

```typescript
// Listen for Livewire events
const ChatComponent: React.FC = () => {
  const [messages, setMessages] = usePersistedState(
    'chatMessages',
    [],
    {
      syncWithLivewire: true,
      livewirePath: 'messages'
    }
  );
  
  React.useEffect(() => {
    // Listen for Livewire events
    window.addEventListener('new-message', (event) => {
      setMessages(prev => [...prev, event.detail]);
    });
    
    return () => {
      window.removeEventListener('new-message', () => {});
    };
  }, []);
  
  const sendMessage = (message: string) => {
    // This will trigger Livewire sync
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: message,
      user: 'current-user',
      timestamp: new Date().toISOString()
    }]);
  };
  
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            <strong>{message.user}:</strong> {message.text}
          </div>
        ))}
      </div>
      <ChatInput onSend={sendMessage} />
    </div>
  );
};
```

## 📊 State Provider

### Context Provider

```typescript
import React from 'react';
import { StateManagerProvider } from '@react-wrapper';

const App: React.FC = () => {
  return (
    <StateManagerProvider
      initialState={{
        user: { name: 'Guest', role: 'visitor' },
        settings: { theme: 'light', language: 'en' },
        ui: { sidebarOpen: false, loading: false }
      }}
      onStateChange={(state) => {
        console.log('Global state changed:', state);
        
        // Send analytics events
        if (state.user?.role === 'admin') {
          analytics.track('admin_state_change', { state });
        }
      }}
      syncPath="app.state" // Sync with Livewire
    >
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Router>
    </StateManagerProvider>
  );
};
```

### HOC Pattern

```typescript
import { withStateManager } from '@react-wrapper';

interface Props {
  title: string;
}

const MyComponent: React.FC<Props> = ({ title }) => {
  // Component has access to state manager via context
  return <div>{title}</div>;
};

// Wrap component with state manager access
export default withStateManager(MyComponent);
```

## 🎯 Advanced Patterns

### State Normalization

```typescript
// Normalized state structure
const useNormalizedData = () => {
  const [entities, setEntities] = useStatePath('entities', {
    users: {},
    posts: {},
    comments: {}
  });
  
  const [ids, setIds] = useStatePath('ids', {
    users: [],
    posts: [],
    comments: []
  });
  
  const addUser = (user: User) => {
    setEntities(prev => ({
      ...prev,
      users: { ...prev.users, [user.id]: user }
    }));
    
    setIds(prev => ({
      ...prev,
      users: [...prev.users, user.id]
    }));
  };
  
  const getUser = (id: string) => entities.users[id];
  const getAllUsers = () => ids.users.map(id => entities.users[id]);
  
  return { addUser, getUser, getAllUsers };
};
```

### State Machines

```typescript
interface LoadingState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: any;
  error: string | null;
}

const useAsyncState = (key: string) => {
  const [state, setState] = useStatePath<LoadingState>(key, {
    status: 'idle',
    data: null,
    error: null
  });
  
  const execute = async (asyncFn: () => Promise<any>) => {
    setState(prev => ({ ...prev, status: 'loading', error: null }));
    
    try {
      const data = await asyncFn();
      setState({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));
      throw error;
    }
  };
  
  const reset = () => {
    setState({ status: 'idle', data: null, error: null });
  };
  
  return { state, execute, reset };
};

// Usage
const DataComponent: React.FC = () => {
  const { state, execute, reset } = useAsyncState('userData');
  
  const fetchData = () => {
    execute(() => fetch('/api/user-data').then(r => r.json()));
  };
  
  return (
    <div>
      {state.status === 'loading' && <div>Loading...</div>}
      {state.status === 'error' && <div>Error: {state.error}</div>}
      {state.status === 'success' && <div>Data: {JSON.stringify(state.data)}</div>}
      
      <button onClick={fetchData}>Fetch Data</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};
```

## 🛠️ Debugging State

### DevTools Integration

```typescript
// Enable state debugging
import { devTools } from '@react-wrapper';

// Track all state changes
devTools.subscribe((event) => {
  if (event.type === 'state:changed') {
    console.log('State change:', event.data);
  }
});

// Show state in debug panel
devTools.showDebugPanel(); // or Ctrl+Shift+W
```

### State Inspector

```typescript
// In browser console
window.ReactWrapper.globalStateManager.getState(); // Get all state
window.ReactWrapper.devTools.getStateHistory(); // Get change history
window.ReactWrapper.devTools.logStateInfo(); // Log state information
```

## 💡 Best Practices

### 1. State Structure
```typescript
// Good: Flat, normalized structure
const goodState = {
  'user.profile': { name: 'John', email: 'john@example.com' },
  'user.preferences': { theme: 'dark', language: 'en' },
  'ui.sidebar': { open: false, width: 250 },
  'data.posts': { 1: { id: 1, title: 'Post 1' } }
};

// Avoid: Deep nesting
const avoidState = {
  user: {
    profile: {
      personal: {
        details: {
          name: 'John' // Too deep
        }
      }
    }
  }
};
```

### 2. Performance
```typescript
// Use batch updates for multiple changes
globalStateManager.batchUpdate([
  { path: 'user.name', value: 'John' },
  { path: 'user.email', value: 'john@example.com' },
  { path: 'user.role', value: 'admin' }
]);

// Debounce frequent updates
const [searchTerm, setSearchTerm] = usePersistedState(
  'searchTerm',
  '',
  { debounceMs: 300 }
);
```

### 3. Type Safety
```typescript
// Define state interfaces
interface AppState {
  user: {
    profile: UserProfile;
    preferences: UserPreferences;
  };
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
  };
}

// Use typed hooks
const [theme, setTheme] = useStatePath<AppState['ui']['theme']>('ui.theme', 'light');
```

---

**Master state management for reactive, persistent applications! 🚀**