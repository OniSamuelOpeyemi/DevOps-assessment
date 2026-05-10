import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || '/api';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching items:', error);
      setLoading(false);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      await axios.post(`${API_URL}/items`, { name: newItem });
      setNewItem('');
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const deleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/items/${id}`);
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>DevOps Assessment - Task Manager</h1>
      </header>
      
      <main className="container">
        <form onSubmit={addItem} className="add-form">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add new task..."
            className="input"
          />
          <button type="submit" className="btn-primary">Add Task</button>
        </form>

        <div className="items-list">
          {items.length === 0 ? (
            <p className="empty">No tasks yet. Add one above!</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="item-card">
                <span className="item-name">{item.name}</span>
                <span className="item-date">{new Date(item.created_at).toLocaleDateString()}</span>
                <button onClick={() => deleteItem(item.id)} className="btn-delete">Delete</button>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Environment: {process.env.NODE_ENV} | Version: {process.env.REACT_APP_VERSION || '1.0.0'}</p>
      </footer>
    </div>
  );
}

export default App;