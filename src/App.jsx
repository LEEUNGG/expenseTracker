import { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DebtDashboard } from './components/DebtDashboard';
import { ExpenseDashboardPage } from './pages/ExpenseDashboardPage';
import { CategoryService } from './lib/services';
import { useToast } from './components/Toast';

function Layout({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  categories, 
  onCategoryUpdate, 
  onCategoryDelete, 
  onCategoryCreate 
}) {
  const location = useLocation();
  
  const getTitle = () => {
    switch (location.pathname) {
      case '/expenses': return 'Expense Tracker';
      case '/debt': return 'Debt Tracker';
      case '/diet': return 'Diet Management';
      default: return 'Expense Tracker';
    }
  };

  const activeCategories = useMemo(() => categories.filter(c => !c.is_deleted), [categories]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        categories={activeCategories}
        onCategoryUpdate={onCategoryUpdate}
        onCategoryDelete={onCategoryDelete}
        onCategoryCreate={onCategoryCreate}
      />

      <div>
        <header className="sticky top-0 z-20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border-b border-white/20 dark:border-gray-700/50 shadow-lg">
          <div className="w-[80%] mx-auto px-2 sm:px-0">
            <div className="flex flex-wrap items-center justify-between gap-2 min-h-[4rem] py-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-300 backdrop-blur-sm flex-shrink-0"
                >
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap truncate">
                  {getTitle()}
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="w-[80%] mx-auto py-8">
           <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  const [categories, setCategories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { addToast } = useToast();

  // 获取分类数据（只在组件挂载时获取一次）
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await CategoryService.getAllCategories();
        setCategories(data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        addToast('Failed to fetch category data', 'error');
      }
    };
    fetchCategories();
  }, [addToast]);

  const handleCategoryUpdate = useCallback(async (id, updates) => {
    try {
      await CategoryService.updateCategory(id, updates);
      const data = await CategoryService.getAllCategories();
      setCategories(data || []);
      addToast('Category updated successfully');
    } catch (err) {
      console.error('Failed to update category:', err);
      addToast('Failed to update category, please try again', 'error');
    }
  }, [addToast]);

  const handleCategoryDelete = useCallback(async (id) => {
    try {
      await CategoryService.deleteCategory(id);
      const data = await CategoryService.getAllCategories();
      setCategories(data || []);
      addToast('Category deleted successfully');
    } catch (err) {
      console.error('Failed to delete category:', err);
      addToast('Failed to delete category, please try again', 'error');
    }
  }, [addToast]);

  const handleCategoryCreate = useCallback(async (category) => {
    try {
      await CategoryService.createCategory(category);
      const data = await CategoryService.getAllCategories();
      setCategories(data || []);
      addToast('New category created successfully');
    } catch (err) {
      console.error('Failed to create category:', err);
      addToast('Failed to create category, please try again', 'error');
    }
  }, [addToast]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout 
            isSidebarOpen={isSidebarOpen} 
            setIsSidebarOpen={setIsSidebarOpen}
            categories={categories}
            onCategoryUpdate={handleCategoryUpdate}
            onCategoryDelete={handleCategoryDelete}
            onCategoryCreate={handleCategoryCreate}
          />}>
          <Route path="/" element={<Navigate to="/expenses" replace />} />
          <Route path="/expenses" element={<ExpenseDashboardPage categories={categories} />} />
          <Route path="/debt" element={<DebtDashboard />} />
          <Route path="/diet" element={
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-full">
                <span className="text-4xl">🥗</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Diet Management</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                This feature is coming soon! Track your calories, macros, and meal plans all in one place.
              </p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
