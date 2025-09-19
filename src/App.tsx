/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { Todo } from './types/Todo';
import * as todoMethods from './api/todo';
import { ErrorNotification } from './components/Error';
import { FilterStatus } from './types/FilterStatus';
import getTodosFilter from './utils/getTodosFilter';
import { ErrorMessage } from './types/ErrorMessage';

type ProcessingState = {
  deleting: number[];
  updating: number[];
};

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    FilterStatus.All,
  );
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({
    deleting: [],
    updating: [],
  });
  const [isInputDisabled, setInputDisabled] = useState(false);

  const isTodosEmpty = todos.length === 0;
  const todosActiveQuantity = todos.filter(todo => !todo.completed).length;
  const todosComplitedQuantity = todos.filter(todo => todo.completed).length;
  const allTodosIsComplited = todos.every(todo => todo.completed);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputDisabled]);

  useEffect(() => {
    todoMethods
      .getTodos()
      .then(setTodos)
      .catch(error => {
        setErrorMessage(ErrorMessage.LOAD);
        throw error;
      });
  }, []);

  const filteredTodos = useMemo((): Todo[] => {
    const filterTodos = getTodosFilter(filterStatus);

    if (!filterTodos) {
      return todos;
    }

    return filterTodos(todos);
  }, [filterStatus, todos]);

  const addTodo = async (title: string): Promise<void> => {
    const userId = todoMethods.USER_ID;

    const temporaryTodo: Todo = {
      id: 0,
      userId,
      title,
      completed: false,
    };

    setTempTodo(temporaryTodo);
    setInputDisabled(true);

    try {
      const newTodo = await todoMethods.createTodo({
        userId,
        title,
        completed: false,
      });

      setTodos(currentTodos => [...currentTodos, newTodo]);
      setTempTodo(null);
    } catch (error) {
      setErrorMessage(ErrorMessage.ADD);
      setTempTodo(null);
      throw error;
    } finally {
      setTempTodo(null);
      setInputDisabled(false);
    }
  };

  const deleteTodo = async (todoId: number): Promise<void> => {
    setProcessing(prev => ({ ...prev, deleting: [...prev.deleting, todoId] }));
    setInputDisabled(true);

    try {
      await todoMethods.deleteTodo(todoId);

      setTodos(currentTodos => currentTodos.filter(todo => todo.id !== todoId));
    } catch (error) {
      setErrorMessage(ErrorMessage.DELETE);
      throw error;
    } finally {
      setProcessing(prev => ({
        ...prev,
        deleting: prev.deleting.filter(id => id !== todoId),
      }));
      setInputDisabled(false);
    }
  };

  const clearAllComplitedTodos = () => {
    const completedTodoIds = todos
      .filter(todo => todo.completed)
      .map(todo => todo.id);

    if (completedTodoIds.length === 0) {
      return;
    }

    setProcessing(prev => ({ ...prev, deleting: completedTodoIds }));
    setInputDisabled(true);

    const deleteTodoPromises = completedTodoIds.map(deleteTodo);

    Promise.all(deleteTodoPromises).finally(() => {
      setProcessing(prev => ({ ...prev, deleting: [] }));
      setInputDisabled(false);
    });
  };

  const updateTodo = async (todo: Todo) => {
    setProcessing(prev => ({ ...prev, updating: [...prev.updating, todo.id] }));

    try {
      const updatedTodo = await todoMethods.updateTodo(todo);

      setTodos(currentTodos =>
        currentTodos.map(currentTodo => {
          if (currentTodo.id === updatedTodo.id) {
            return updatedTodo;
          }

          return currentTodo;
        }),
      );
    } catch (error) {
      setErrorMessage(ErrorMessage.UPDATE);
      throw error;
    } finally {
      setProcessing(prev => ({
        ...prev,
        updating: prev.updating.filter(id => id !== todo.id),
      }));
    }
  };

  const toggleTodos = async () => {
    const targetStatus = !allTodosIsComplited;

    const todosToUpdate = todos.filter(todo => todo.completed !== targetStatus);

    try {
      for (const todo of todosToUpdate) {
        await updateTodo({ ...todo, completed: targetStatus });
      }
    } catch (error) {
      setErrorMessage(ErrorMessage.UPDATE);
      throw error;
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          addTodo={addTodo}
          setErrorMessage={setErrorMessage}
          isInputDisabled={isInputDisabled}
          inputRef={inputRef}
          allTodosIsComplited={allTodosIsComplited}
          isTodosEmpty={isTodosEmpty}
          toggleTodos={toggleTodos}
        />
        <TodoList
          todos={filteredTodos}
          deleteTodo={deleteTodo}
          deletingTodoIds={processing.deleting}
          updatingTodoIds={processing.updating}
          tempTodo={tempTodo}
          updateTodo={updateTodo}
        />
        {todos.length > 0 && (
          <Footer
            setFilterStatus={setFilterStatus}
            filterStatus={filterStatus}
            todosActiveQuantity={todosActiveQuantity}
            todosComplitedQuantity={todosComplitedQuantity}
            clearAllComplitedTodos={clearAllComplitedTodos}
          />
        )}
      </div>

      <ErrorNotification error={errorMessage} setError={setErrorMessage} />
    </div>
  );
};
