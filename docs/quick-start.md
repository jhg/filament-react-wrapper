# Quick Start Guide

Get up and running with React Wrapper in 5 minutes! This guide assumes you've already completed the [installation](./installation.md).

## 🎯 Your First Component

### 1. Create a React Component

```typescript
// resources/js/components/UserCard.tsx
import React from 'react';

interface UserCardProps {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

const UserCard: React.FC<UserCardProps> = ({ name, email, avatar, role = 'User' }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm">
      <div className="flex items-center space-x-4">
        {avatar && (
          <img 
            src={avatar} 
            alt={name} 
            className="w-12 h-12 rounded-full object-cover"
          />
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">{email}</p>
          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
            {role}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
```

### 2. Register the Component

```javascript
// resources/js/app.js
import '@react-wrapper';
import UserCard from './components/UserCard';

// Register the component
window.ReactComponentRegistry.register({
    name: 'UserCard',
    component: UserCard,
    defaultProps: {
        role: 'Member'
    },
    metadata: {
        category: 'user',
        description: 'A user profile card component'
    }
});
```

### 3. Use in Blade Templates

```blade
{{-- resources/views/users/show.blade.php --}}
@extends('layouts.app')

@section('content')
<div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">User Profile</h1>
    
    {{-- React component will render here --}}
    <div 
        data-react-component="UserCard"
        data-react-props='{
            "name": "{{ $user->name }}",
            "email": "{{ $user->email }}",
            "avatar": "{{ $user->avatar_url }}",
            "role": "{{ $user->role }}"
        }'
    ></div>
</div>
@endsection
```

### 4. Build and Test

```bash
npm run build
```

Visit your blade template and see your React component in action! 🎉

## 🎨 Filament Integration

### 1. Create a Filament Form Field

```php
// app/Filament/Resources/UserResource.php
use HadyFayed\ReactWrapper\Forms\Components\ReactField;

public static function form(Form $form): Form
{
    return $form
        ->schema([
            TextInput::make('name')->required(),
            TextInput::make('email')->email()->required(),
            
            ReactField::make('profile_preview')
                ->component('UserCard')
                ->props(fn($record) => [
                    'name' => $record?->name,
                    'email' => $record?->email,
                    'role' => $record?->role,
                ])
                ->live()
                ->reactive(),
        ]);
}
```

### 2. Create a Filament Widget

```php
// app/Filament/Widgets/UserStatsWidget.php
use HadyFayed\ReactWrapper\Widgets\ReactWidget;

class UserStatsWidget extends ReactWidget
{
    protected string $component = 'UserStatsChart';
    
    protected function getProps(): array
    {
        return [
            'totalUsers' => User::count(),
            'activeUsers' => User::where('last_login_at', '>', now()->subDays(30))->count(),
            'newUsers' => User::where('created_at', '>', now()->subDays(7))->count(),
        ];
    }
    
    protected function getHeight(): ?string
    {
        return '300px';
    }
}
```

## 🔄 State Management

### 1. Using State Manager

```typescript
// resources/js/components/InteractiveUserCard.tsx
import React from 'react';
import { useStatePath } from '@react-wrapper';

const InteractiveUserCard: React.FC = () => {
    const [user, setUser] = useStatePath('currentUser', {
        name: '',
        email: '',
        role: 'User'
    });
    
    const [isEditing, setIsEditing] = useStatePath('isEditing', false);
    
    const handleSave = () => {
        // Save logic here
        setIsEditing(false);
    };
    
    return (
        <div className="user-card">
            {isEditing ? (
                <div className="edit-mode">
                    <input 
                        value={user.name}
                        onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Name"
                        className="form-input"
                    />
                    <input 
                        value={user.email}
                        onChange={(e) => setUser(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email"
                        className="form-input"
                    />
                    <button onClick={handleSave} className="btn-primary">Save</button>
                    <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
                </div>
            ) : (
                <div className="view-mode">
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                    <span className="role-badge">{user.role}</span>
                    <button onClick={() => setIsEditing(true)} className="btn-primary">Edit</button>
                </div>
            )}
        </div>
    );
};

export default InteractiveUserCard;
```

### 2. State Persistence

```typescript
// resources/js/components/UserPreferences.tsx
import React from 'react';
import { usePersistedState } from '@react-wrapper';

const UserPreferences: React.FC = () => {
    const [theme, setTheme] = usePersistedState('userTheme', 'light', {
        storage: 'localStorage',
        syncWithLivewire: true,
        livewirePath: 'user.preferences.theme'
    });
    
    const [language, setLanguage] = usePersistedState('userLanguage', 'en', {
        storage: 'localStorage'
    });
    
    return (
        <div className="preferences-panel">
            <h3>User Preferences</h3>
            
            <div className="setting-group">
                <label>Theme:</label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto</option>
                </select>
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

export default UserPreferences;
```

## 🧪 Development with Storybook

### 1. Start Storybook

```bash
npm run storybook
```

### 2. Create a Story

```typescript
// stories/UserCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import UserCard from '../resources/js/components/UserCard';

const meta: Meta<typeof UserCard> = {
  title: 'Components/UserCard',
  component: UserCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    role: {
      control: { type: 'select' },
      options: ['User', 'Admin', 'Member', 'Guest'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'User',
  },
};

export const WithAvatar: Story = {
  args: {
    name: 'Jane Smith',
    email: 'jane@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b742?w=150',
    role: 'Admin',
  },
};

export const Member: Story = {
  args: {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'Member',
  },
};
```

## 🛠️ Debug and Monitor

### 1. Enable Debug Mode

```env
REACT_WRAPPER_DEBUG=true
```

### 2. Use Dev Tools

```javascript
// In browser console or component
window.ReactWrapper.devTools.showDebugPanel();

// Track component performance
window.ReactWrapper.devTools.logPerformanceInfo();

// View component registry
window.ReactWrapper.devTools.logComponentInfo();
```

### 3. Keyboard Shortcuts

- `Ctrl+Shift+W` - Show debug panel
- `Ctrl+Shift+C` - Log component info
- `Ctrl+Shift+S` - Log state info

## 🧪 Testing

### 1. Write Component Tests

```typescript
// tests/components/UserCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserCard from '../../resources/js/components/UserCard';

describe('UserCard', () => {
  it('renders user information correctly', () => {
    render(
      <UserCard 
        name="John Doe" 
        email="john@example.com" 
        role="Admin" 
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
  
  it('uses default role when not provided', () => {
    render(
      <UserCard 
        name="Jane Doe" 
        email="jane@example.com" 
      />
    );
    
    expect(screen.getByText('User')).toBeInTheDocument();
  });
});
```

### 2. Run Tests

```bash
npm run test
npm run test:coverage
```

## 🚀 Build for Production

### 1. Optimize Build

```bash
npm run build:all
```

### 2. Performance Check

```bash
npm run analyze
```

## 🎯 Next Steps

Now that you have the basics working:

1. 📚 Explore [Component Registry](./component-registry.md) for advanced registration
2. 🎨 Learn [State Management](./state-management.md) patterns
3. ⚡ Implement [Code Splitting](./code-splitting.md) for performance
4. 🔄 Set up [Component Versioning](./versioning.md) for maintenance
5. 🛠️ Master [Developer Tools](./dev-tools.md) for debugging

## 💡 Pro Tips

- **Use TypeScript** for better development experience
- **Enable debug mode** during development
- **Write tests** for your components
- **Use Storybook** for component development
- **Monitor performance** with dev tools
- **Implement code splitting** for large applications

---

**You're now ready to build amazing React components in Laravel! 🎉**