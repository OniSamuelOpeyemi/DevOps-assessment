import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import App from './App';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock environment variables
delete window.location;
window.location = { reload: jest.fn() };

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', async () => {
    // Mock pending API call
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));

    render(<App />);

    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    expect(screen.getByText('📋 DevOps Assessment')).toBeInTheDocument();
  });

  test('renders items when API call succeeds', async () => {
    const mockItems = [
      {
        id: 1,
        name: 'Test Task 1',
        created_at: '2026-05-11T10:00:00Z'
      },
      {
        id: 2,
        name: 'Test Task 2',
        created_at: '2026-05-11T11:00:00Z'
      }
    ];

    mockedAxios.get.mockResolvedValue({ data: mockItems });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      expect(screen.getByText('Test Task 2')).toBeInTheDocument();
    });

    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  test('renders error state when API call fails', async () => {
    const errorMessage = 'Network Error';
    mockedAxios.get.mockRejectedValue(new Error(errorMessage));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch items/)).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('renders empty state when no items', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet!')).toBeInTheDocument();
      expect(screen.getByText('Add your first task above to get started.')).toBeInTheDocument();
    });

    expect(screen.getByText('0 tasks')).toBeInTheDocument();
  });

  test('adds new item successfully', async () => {
    const newItemName = 'New Test Task';
    const mockItems = [{ id: 1, name: 'Existing Task', created_at: '2026-05-11T10:00:00Z' }];
    const updatedItems = [
      ...mockItems,
      { id: 2, name: newItemName, created_at: '2026-05-11T12:00:00Z' }
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: mockItems });
    mockedAxios.post.mockResolvedValue({ data: { id: 2, name: newItemName } });
    mockedAxios.get.mockResolvedValueOnce({ data: updatedItems });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Existing Task')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add a new task...');
    const button = screen.getByText('Add Task');

    fireEvent.change(input, { target: { value: newItemName } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/items',
        { name: newItemName }
      );
    });

    expect(input.value).toBe('');
  });

  test('shows error when adding item fails', async () => {
    const newItemName = 'New Test Task';
    const mockItems = [{ id: 1, name: 'Existing Task', created_at: '2026-05-11T10:00:00Z' }];

    mockedAxios.get.mockResolvedValue({ data: mockItems });
    mockedAxios.post.mockRejectedValue(new Error('API Error'));

    // Mock window.alert
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Existing Task')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add a new task...');
    const button = screen.getByText('Add Task');

    fireEvent.change(input, { target: { value: newItemName } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('Failed to add item');
    });

    alertMock.mockRestore();
  });

  test('deletes item successfully', async () => {
    const mockItems = [
      { id: 1, name: 'Task to Delete', created_at: '2026-05-11T10:00:00Z' },
      { id: 2, name: 'Keep This Task', created_at: '2026-05-11T11:00:00Z' }
    ];
    const remainingItems = [mockItems[1]];

    mockedAxios.get.mockResolvedValueOnce({ data: mockItems });
    mockedAxios.delete.mockResolvedValue({});
    mockedAxios.get.mockResolvedValueOnce({ data: remainingItems });

    // Mock window.confirm to return true
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Task to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByTitle('Delete task')[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith('http://localhost:5000/api/items/1');
    });

    expect(screen.queryByText('Task to Delete')).not.toBeInTheDocument();
    expect(screen.getByText('Keep This Task')).toBeInTheDocument();

    confirmMock.mockRestore();
  });

  test('does not delete item when user cancels', async () => {
    const mockItems = [{ id: 1, name: 'Task to Delete', created_at: '2026-05-11T10:00:00Z' }];

    mockedAxios.get.mockResolvedValue({ data: mockItems });

    // Mock window.confirm to return false
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Task to Delete')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete task');
    fireEvent.click(deleteButton);

    expect(mockedAxios.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Task to Delete')).toBeInTheDocument();

    confirmMock.mockRestore();
  });

  test('disables submit button when input is empty', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add a new task...');
    const button = screen.getByText('Add Task');

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: '   ' } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Valid Task' } });
    expect(button).not.toBeDisabled();
  });

  test('shows submitting state during form submission', async () => {
    const newItemName = 'New Task';
    const mockItems = [];

    mockedAxios.get.mockResolvedValueOnce({ data: mockItems });
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 100)));
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 1, name: newItemName }] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet!')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Add a new task...');
    const button = screen.getByText('Add Task');

    fireEvent.change(input, { target: { value: newItemName } });
    fireEvent.click(button);

    expect(screen.getByText('Adding...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Add Task')).toBeInTheDocument();
    });
  });

  test('retry button refetches items', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 1, name: 'Retried Task' }] });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch items/)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Retried Task')).toBeInTheDocument();
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});