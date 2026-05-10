import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to fetch items. Make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      setSubmitting(true);
      await axios.post(`${API_URL}/items`, { name: newItem });
      setNewItem('');
      fetchItems();
    } catch (err) {
      console.error('Error adding item:', err);
      alert('Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await axios.delete(`${API_URL}/items/${id}`);
      fetchItems();
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>📋 DevOps Assessment</h1>
        <p className="subtitle">Task Manager Application</p>
      </header>

      <main className="container">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <div className="error-content">
              <strong>Error:</strong> {error}
              <button onClick={fetchItems} className="retry-btn">
                Retry
              </button>
            </div>
          </div>
        )}

        <form onSubmit={addItem} className="add-form">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add a new task..."
            className="task-input"
            disabled={submitting}
          />
          <button 
            type="submit" 
            className="btn-primary"
            disabled={submitting || !newItem.trim()}
          >
            {submitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>

        <div className="tasks-section">
          <div className="tasks-header">
            <h2>Your Tasks</h2>
            <span className="task-count">{items.length} tasks</span>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No tasks yet!</h3>
              <p>Add your first task above to get started.</p>
            </div>
          ) : (
            <div className="items-list">
              {items.map((item) => (
                <div key={item.id} className="item-card">
                  <div className="item-content">
                    <div className="item-icon">✓</div>
                    <div className="item-details">
                      <h3 className="item-name">{item.name}</h3>
                      <span className="item-date">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="btn-delete"
                    title="Delete task"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>Environment: <strong>{process.env.NODE_ENV || 'development'}</strong></p>
          <p>API: <strong>{API_URL}</strong></p>
          <p className="copyright">DevOps Assessment Project © 2026</p>
        </div>
      </footer>
    </div>
  );
}

export default App;