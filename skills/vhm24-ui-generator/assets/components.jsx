import React from 'react';
import { 
  CheckCircle, XCircle, AlertTriangle, AlertCircle, Info, 
  ChevronRight, X, Loader2 
} from 'lucide-react';

// ============================================
// VENDHUB OS - Reusable UI Components
// ============================================

// Status Badge
export const StatusBadge = ({ status, size = 'md' }) => {
  const styles = {
    online: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-emerald-100 text-emerald-700',
    offline: 'bg-gray-100 text-gray-700',
    inactive: 'bg-gray-100 text-gray-700',
    warning: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    overdue: 'bg-red-100 text-red-700',
    maintenance: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    draft: 'bg-purple-100 text-purple-700'
  };
  
  const labels = {
    online: 'Активен',
    active: 'Активен',
    completed: 'Завершено',
    paid: 'Оплачено',
    offline: 'Офлайн',
    inactive: 'Неактивен',
    warning: 'Внимание',
    pending: 'Ожидание',
    error: 'Ошибка',
    overdue: 'Просрочено',
    maintenance: 'ТО',
    in_progress: 'В работе',
    draft: 'Черновик'
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`rounded-full font-medium ${styles[status] || styles.inactive} ${sizes[size]}`}>
      {labels[status] || status}
    </span>
  );
};

// Priority Badge
export const PriorityBadge = ({ priority }) => {
  const styles = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-amber-500 text-white',
    low: 'bg-gray-400 text-white'
  };
  
  const labels = {
    critical: 'Критический',
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

// Card component
export const Card = ({ children, className = '', padding = 'p-5', onClick }) => (
  <div 
    className={`bg-white rounded-xl shadow-sm border border-gray-100 ${padding} ${className} ${onClick ? 'cursor-pointer hover:border-amber-200 transition-colors' : ''}`}
    onClick={onClick}
  >
    {children}
  </div>
);

// Card Header
export const CardHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-amber-600" />
        </div>
      )}
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// Stats Card
export const StatsCard = ({ title, value, change, icon: Icon, trend = 'up', color = 'amber' }) => {
  const colors = {
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-sm">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <span className={`text-sm font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend === 'up' ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-gray-400">vs прошлый период</span>
        </div>
      )}
    </Card>
  );
};

// Button component
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button'
}) => {
  const variants = {
    primary: 'bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50',
    outline: 'border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50',
    ghost: 'text-gray-600 hover:bg-gray-100 disabled:opacity-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
    </button>
  );
};

// Input component
export const Input = ({ 
  label, 
  error, 
  icon: Icon, 
  className = '', 
  ...props 
}) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      )}
      <input
        className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
          Icon ? 'pl-10' : ''
        } ${error ? 'border-red-300' : 'border-gray-200'}`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

// Select component
export const Select = ({ label, options, error, className = '', ...props }) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
        error ? 'border-red-300' : 'border-gray-200'
      }`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

// Toggle component
export const Toggle = ({ checked, onChange, label, disabled = false }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div className="relative">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-disabled:opacity-50"></div>
    </div>
    {label && <span className="text-sm text-gray-700">{label}</span>}
  </label>
);

// Modal component
export const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl w-full mx-4 ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Alert component
export const Alert = ({ type = 'info', title, message, onClose }) => {
  const styles = {
    success: { bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-500' },
    error: { bg: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-500' }
  };

  const config = styles[type];
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bg} flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        {title && <p className="font-medium text-gray-900">{title}</p>}
        {message && <p className="text-sm text-gray-600 mt-0.5">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-white/50 rounded">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
};

// Empty State component
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center py-12">
    {Icon && (
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    )}
    <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
    {description && <p className="text-gray-500 mb-4">{description}</p>}
    {action}
  </div>
);

// Loading Spinner
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <Loader2 className={`animate-spin text-amber-500 ${sizes[size]} ${className}`} />
  );
};

// Loading Overlay
export const LoadingOverlay = ({ message = 'Загрузка...' }) => (
  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-2" />
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Avatar component
export const Avatar = ({ name, image, size = 'md', status }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const initials = name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      {image ? (
        <img src={image} alt={name} className={`rounded-full object-cover ${sizes[size]}`} />
      ) : (
        <div className={`rounded-full bg-amber-100 text-amber-600 font-medium flex items-center justify-center ${sizes[size]}`}>
          {initials}
        </div>
      )}
      {status && (
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
          status === 'online' ? 'bg-emerald-500' : 
          status === 'away' ? 'bg-amber-500' : 'bg-gray-400'
        }`} />
      )}
    </div>
  );
};

// Progress Bar
export const ProgressBar = ({ value, max = 100, color = 'amber', showLabel = false, size = 'md' }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const colors = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizes[size]}`}>
        <div 
          className={`${colors[color]} rounded-full transition-all duration-300 ${sizes[size]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-500 mt-1">{Math.round(percentage)}%</p>
      )}
    </div>
  );
};

// Tabs component
export const Tabs = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === tab.id
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {tab.icon && <tab.icon className="w-4 h-4" />}
        {tab.label}
        {tab.badge !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            activeTab === tab.id ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-600'
          }`}>
            {tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

// Breadcrumb component
export const Breadcrumb = ({ items }) => (
  <nav className="flex items-center gap-2 text-sm">
    {items.map((item, index) => (
      <React.Fragment key={index}>
        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
        {item.href ? (
          <a href={item.href} className="text-gray-500 hover:text-gray-700">
            {item.label}
          </a>
        ) : (
          <span className="text-gray-900 font-medium">{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export default {
  StatusBadge,
  PriorityBadge,
  Card,
  CardHeader,
  StatsCard,
  Button,
  Input,
  Select,
  Toggle,
  Modal,
  Alert,
  EmptyState,
  Spinner,
  LoadingOverlay,
  Avatar,
  ProgressBar,
  Tabs,
  Breadcrumb
};
