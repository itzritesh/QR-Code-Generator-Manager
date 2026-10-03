import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineQrcode,
  HiOutlineViewGrid,
  HiOutlinePlusCircle,
  HiOutlineCollection,
  HiOutlineChartBar,
  HiOutlineTemplate,
  HiOutlineCog,
  HiOutlineBell,
  HiOutlineSearch,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineUserCircle,
  HiOutlineLogout,
  HiOutlineExternalLink,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi';
import { Dropdown } from '../components/ui/Dropdown';
import { Button, IconButton } from '../components/ui/Button';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isHealthy } = useHealthCheck();
  const { user, logout } = useAuth();

  const [notificationList, setNotificationList] = useState([
    {
      id: '1',
      title: 'QR Code Scanned',
      message: 'Your dynamic link "Spring Campaign Menu" received 45 new scans.',
      time: '10m ago',
      unread: true,
    },
    {
      id: '2',
      title: 'Database Synchronized',
      message: 'PostgreSQL database connected and operational.',
      time: '1h ago',
      unread: false,
    },
  ]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/qr-codes?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return (
      name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    );
  };

  interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    exact?: boolean;
  }

  const mainNav: NavItem[] = [
    { label: 'Dashboard', path: '/app', icon: <HiOutlineViewGrid className="w-4 h-4" />, exact: true },
    { label: 'Create QR', path: '/app/create', icon: <HiOutlinePlusCircle className="w-4 h-4" /> },
    { label: 'Bulk Generator', path: '/app/bulk', icon: <HiOutlineDocumentDuplicate className="w-4 h-4" /> },
    { label: 'My QR Codes', path: '/app/qr-codes', icon: <HiOutlineCollection className="w-4 h-4" /> },
    { label: 'Analytics', path: '/app/analytics', icon: <HiOutlineChartBar className="w-4 h-4" /> },
    { label: 'Templates', path: '/app/templates', icon: <HiOutlineTemplate className="w-4 h-4" /> },
  ];

  const accountNav: NavItem[] = [
    { label: 'Settings', path: '/app/settings', icon: <HiOutlineCog className="w-4 h-4" /> },
    { label: 'Profile', path: '/app/profile', icon: <HiOutlineUserCircle className="w-4 h-4" /> },
  ];

  const allNavItems = [...mainNav, ...accountNav];

  const getPageTitle = () => {
    const current = allNavItems.find((item) =>
      item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
    );
    if (current) return current.label;
    if (location.pathname === '/app/profile') return 'Profile';
    return 'Dashboard';
  };

  const markAllNotificationsAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const hasUnreadNotifications = notificationList.some((n) => n.unread);

  return (
    <div className="h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row overflow-hidden">
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR (Compact, balanced w-60)                   */}
      {/* ========================================================= */}
      <aside className="hidden md:flex md:w-60 flex-col bg-white border-r border-slate-200/90 shrink-0 h-full z-30">
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <HiOutlineQrcode className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-slate-900 text-sm leading-tight">QR Manager</span>
              <span className="text-[10px] text-slate-400 font-medium">Studio Platform</span>
            </div>
          </Link>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <Link to="/app/create" className="block w-full">
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<HiOutlinePlusCircle className="w-4 h-4" />}
            >
              Create QR Code
            </Button>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-2.5 py-1 space-y-4 overflow-y-auto" aria-label="Main Navigation">
          {/* Main Group */}
          <div>
            <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
              Main
            </div>
            <div className="space-y-0.5">
              {mainNav.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group select-none text-left',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Account Group */}
          <div>
            <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
              Account
            </div>
            <div className="space-y-0.5">
              {accountNav.map((item) => {
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors group select-none text-left',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <span
                      className={cn(
                        'shrink-0 transition-colors',
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom Status & Profile */}
        <div className="p-2.5 border-t border-slate-100 space-y-2">
          {/* Health status */}
          <Link
            to="/status"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 hover:bg-slate-100/70 transition-colors text-xs text-slate-600"
          >
            <span className="text-[11px] font-medium text-slate-500">Database</span>
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', isHealthy ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse')} />
              <span className="text-[11px] font-medium text-slate-700">{isHealthy ? 'Connected' : 'Connecting'}</span>
            </div>
          </Link>

          {/* User profile row */}
          <div className="flex items-center justify-between p-1.5 rounded-lg border border-slate-100 bg-white">
            <Link to="/app/profile" className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  {getInitials(user?.name)}
                </div>
              )}
              <div className="flex flex-col text-left truncate min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'Account'}</span>
                <span className="text-[10px] text-slate-400 truncate">{user?.email || ''}</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
            >
              <HiOutlineLogout className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE DRAWER NAVIGATION                                  */}
      {/* ========================================================= */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-slate-200 shadow-2xl">
            <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between">
              <Link to="/app" onClick={() => setMobileSidebarOpen(false)} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <HiOutlineQrcode className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">QR Manager</span>
              </Link>
              <IconButton
                variant="ghost"
                size="sm"
                ariaLabel="Close sidebar menu"
                icon={<HiOutlineX className="w-4 h-4" />}
                onClick={() => setMobileSidebarOpen(false)}
              />
            </div>

            <div className="p-3">
              <Link to="/app/create" onClick={() => setMobileSidebarOpen(false)} className="block w-full">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<HiOutlinePlusCircle className="w-4 h-4" />}
                >
                  Create QR Code
                </Button>
              </Link>
            </div>

            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto text-left">
              {allNavItems.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-100 space-y-2">
              <Link
                to="/status"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center justify-between text-xs text-slate-600 p-2 rounded-lg bg-slate-50"
              >
                <span>System Health</span>
                <span className={cn('w-2 h-2 rounded-full', isHealthy ? 'bg-emerald-500' : 'bg-amber-400')} />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2 text-xs font-medium text-rose-600 hover:text-rose-700 w-full text-left p-2 rounded-lg"
              >
                <HiOutlineLogout className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MAIN VIEWPORT CONTAINER                                   */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar (Clean, compact 56px height, no noisy breadcrumb) */}
        <header className="h-14 shrink-0 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-20">
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center gap-2.5">
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel="Open navigation menu"
              icon={<HiOutlineMenuAlt2 className="w-4 h-4" />}
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden"
            />

            <h1 className="text-sm sm:text-base font-semibold text-slate-900 leading-none">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-2.5">
            {/* Quick search input */}
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center relative">
              <div className="absolute left-2.5 text-slate-400 pointer-events-none">
                <HiOutlineSearch className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search QR codes..."
                className="w-44 md:w-56 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </form>

            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <IconButton
                variant="ghost"
                size="sm"
                ariaLabel="Notifications"
                icon={
                  <div className="relative inline-flex items-center justify-center">
                    <HiOutlineBell className="w-4 h-4" />
                    {hasUnreadNotifications && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-600 ring-2 ring-white" />
                    )}
                  </div>
                }
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              />

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white p-3 shadow-lg border border-slate-200 z-50 text-left animate-in fade-in duration-100">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    {hasUnreadNotifications && (
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className="text-[10px] text-indigo-600 font-medium hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {notificationList.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'p-2 rounded-lg border text-left transition-colors',
                          n.unread ? 'bg-indigo-50/40 border-indigo-100' : 'bg-white border-slate-100'
                        )}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                          <span>{n.title}</span>
                          <span className="text-[10px] font-normal text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <Dropdown
              trigger={
                <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user?.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-2xs" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {getInitials(user?.name)}
                    </div>
                  )}
                  <span className="hidden sm:inline-block text-xs font-medium text-slate-700">
                    {user?.name || 'Account'}
                  </span>
                </div>
              }
              items={[
                {
                  label: 'View Profile',
                  icon: <HiOutlineUserCircle className="w-4 h-4 text-slate-400" />,
                  onClick: () => navigate('/app/profile'),
                },
                {
                  label: 'Settings',
                  icon: <HiOutlineCog className="w-4 h-4 text-slate-400" />,
                  onClick: () => navigate('/app/settings'),
                },
                {
                  label: 'System Health',
                  icon: <HiOutlineExternalLink className="w-4 h-4 text-slate-400" />,
                  onClick: () => navigate('/status'),
                  divider: true,
                },
                {
                  label: 'Sign Out',
                  icon: <HiOutlineLogout className="w-4 h-4 text-rose-500" />,
                  danger: true,
                  onClick: handleLogout,
                },
              ]}
            />
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
