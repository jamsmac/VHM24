# VendHub OS Screen Patterns

## Table of Contents
1. [File Structure](#file-structure)
2. [Dashboard Pattern](#dashboard-pattern)
3. [List Pattern](#list-pattern)
4. [Detail Pattern](#detail-pattern)
5. [Form/Modal Pattern](#form-modal-pattern)
6. [Kanban Pattern](#kanban-pattern)
7. [Mobile App Pattern](#mobile-app-pattern)

---

## File Structure

Every screen file follows this structure:

```jsx
import React, { useState, useEffect } from 'react';
import { Icon1, Icon2, Icon3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ===== DATA =====
const mockData = [...];

// ===== COMPONENTS =====
const LocalComponent = ({ props }) => (...);

// ===== MAIN COMPONENT =====
const ScreenName = () => {
  const [state, setState] = useState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6">
      {/* Page Header */}
      {/* Main Content */}
      {/* Modals */}
    </div>
  );
};

export default ScreenName;
```

---

## Dashboard Pattern

For overview screens with KPIs and charts.

### Structure
```jsx
<div className="p-6 space-y-6">
  {/* Page Header */}
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
      <p className="text-gray-500">Обзор за сегодня</p>
    </div>
    <div className="flex gap-3">
      {/* Actions: filters, date picker, refresh */}
    </div>
  </div>

  {/* KPI Cards Row */}
  <div className="grid grid-cols-4 gap-4">
    <StatsCard title="Выручка" value="2.3 млн" icon={DollarSign} />
    {/* More stats */}
  </div>

  {/* Charts Row */}
  <div className="grid grid-cols-3 gap-6">
    <Card className="col-span-2">
      {/* Main chart */}
    </Card>
    <Card>
      {/* Secondary chart/list */}
    </Card>
  </div>

  {/* Tables/Activity */}
  <div className="grid grid-cols-2 gap-6">
    {/* Alerts, activity feed, etc */}
  </div>
</div>
```

### KPI Card
```jsx
const StatsCard = ({ title, value, change, icon: Icon, trend = 'up', color = 'amber' }) => (
  <Card>
    <div className="flex items-center justify-between mb-3">
      <span className="text-gray-500 text-sm">{title}</span>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`}>
        <Icon className={`w-5 h-5 text-${color}-600`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {change && (
      <div className="flex items-center gap-1 mt-2">
        <span className={`text-sm font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend === 'up' ? '+' : ''}{change}%
        </span>
        <span className="text-sm text-gray-400">vs прошлый период</span>
      </div>
    )}
  </Card>
);
```

---

## List Pattern

For entity lists with filters and actions.

### Structure
```jsx
<div className="p-6 space-y-6">
  {/* Header with count and actions */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <h1 className="text-2xl font-bold text-gray-900">Автоматы</h1>
      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
        47 всего
      </span>
    </div>
    <Button icon={Plus}>Добавить</Button>
  </div>

  {/* Filters Bar */}
  <Card padding="p-4">
    <div className="flex items-center gap-4">
      <Input icon={Search} placeholder="Поиск..." />
      <Select options={statusOptions} />
      <Select options={locationOptions} />
      {/* More filters */}
    </div>
  </Card>

  {/* View Tabs */}
  <Tabs tabs={viewTabs} activeTab={view} onChange={setView} />

  {/* Table or Grid */}
  {view === 'table' ? (
    <Table columns={columns} data={filteredData} />
  ) : (
    <div className="grid grid-cols-3 gap-4">
      {filteredData.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  )}

  {/* Pagination */}
  <Pagination current={page} total={totalPages} onChange={setPage} />
</div>
```

### Table Row
```jsx
<tr className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(item.id)}>
  <td className="px-4 py-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
        <Coffee className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <p className="font-medium text-gray-900">{item.name}</p>
        <p className="text-sm text-gray-500">{item.id}</p>
      </div>
    </div>
  </td>
  <td className="px-4 py-3">
    <StatusBadge status={item.status} />
  </td>
  {/* More columns */}
  <td className="px-4 py-3">
    <div className="flex items-center gap-2">
      <button className="p-2 hover:bg-gray-100 rounded-lg">
        <Eye className="w-4 h-4 text-gray-400" />
      </button>
      <button className="p-2 hover:bg-gray-100 rounded-lg">
        <Edit className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  </td>
</tr>
```

---

## Detail Pattern

For single entity detail views.

### Structure
```jsx
<div className="p-6 space-y-6">
  {/* Breadcrumb */}
  <Breadcrumb items={[
    { label: 'Автоматы', href: '#machines' },
    { label: 'VM-001' }
  ]} />

  {/* Header Card */}
  <Card>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center">
          <Coffee className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{machine.name}</h1>
            <StatusBadge status={machine.status} size="lg" />
          </div>
          <p className="text-gray-500">{machine.location}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" icon={Edit}>Редактировать</Button>
        <Button variant="danger" icon={Trash2}>Удалить</Button>
      </div>
    </div>
  </Card>

  {/* Tabs */}
  <Tabs tabs={detailTabs} activeTab={tab} onChange={setTab} />

  {/* Tab Content */}
  <div className="grid grid-cols-3 gap-6">
    <div className="col-span-2 space-y-6">
      {/* Main content */}
    </div>
    <div className="space-y-6">
      {/* Sidebar: quick stats, actions */}
    </div>
  </div>
</div>
```

---

## Form/Modal Pattern

For create/edit forms.

### Modal Structure
```jsx
<Modal isOpen={isOpen} onClose={onClose} title="Добавить автомат" size="lg">
  <form onSubmit={handleSubmit} className="space-y-4">
    {/* Form sections */}
    <div className="grid grid-cols-2 gap-4">
      <Input label="Название" name="name" required />
      <Select label="Локация" name="location" options={locations} />
    </div>

    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Конфигурация</h4>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Вместимость кофе" name="coffee_capacity" type="number" />
        {/* More fields */}
      </div>
    </div>

    {/* Actions */}
    <div className="flex justify-end gap-3 pt-4 border-t">
      <Button variant="secondary" onClick={onClose}>Отмена</Button>
      <Button type="submit" loading={saving}>Сохранить</Button>
    </div>
  </form>
</Modal>
```

### Inline Form
```jsx
<Card>
  <CardHeader title="Настройки" icon={Settings} />
  <form className="space-y-6">
    <div className="grid grid-cols-2 gap-6">
      {/* Form fields */}
    </div>
    <div className="flex justify-end">
      <Button type="submit">Сохранить изменения</Button>
    </div>
  </form>
</Card>
```

---

## Kanban Pattern

For task boards with drag-drop.

### Structure
```jsx
<div className="p-6">
  {/* Header */}
  <div className="flex items-center justify-between mb-6">
    <h1 className="text-2xl font-bold">Задачи</h1>
    <Button icon={Plus}>Новая задача</Button>
  </div>

  {/* Kanban Board */}
  <div className="flex gap-4 overflow-x-auto pb-4">
    {columns.map(column => (
      <div key={column.id} className="flex-shrink-0 w-80">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full bg-${column.color}-500`} />
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
              {column.tasks.length}
            </span>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Task Cards */}
        <div className="space-y-3">
          {column.tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    ))}
  </div>
</div>
```

### Task Card
```jsx
const TaskCard = ({ task }) => (
  <Card padding="p-4" className="cursor-pointer hover:shadow-md">
    <div className="flex items-start justify-between mb-2">
      <PriorityBadge priority={task.priority} />
      <span className="text-xs text-gray-400">{task.id}</span>
    </div>
    <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
    <p className="text-sm text-gray-500 mb-3">{task.description}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Avatar name={task.assignee} size="sm" />
        <span className="text-sm text-gray-600">{task.assignee}</span>
      </div>
      <span className="text-xs text-gray-400">{task.dueDate}</span>
    </div>
  </Card>
);
```

---

## Mobile App Pattern

For mobile-first screens (375px width frame).

### Structure
```jsx
<div className="max-w-md mx-auto bg-gray-100 min-h-screen">
  {/* Mobile Frame */}
  <div className="bg-white rounded-3xl overflow-hidden shadow-xl mx-auto relative">
    {/* Status Bar */}
    <div className="h-11 bg-black flex items-center justify-between px-6">
      <span className="text-white text-sm">9:41</span>
      <div className="flex items-center gap-1">
        {/* Signal, wifi, battery icons */}
      </div>
    </div>

    {/* Header */}
    <div className="bg-amber-500 text-white p-4">
      <h1 className="text-lg font-bold">{title}</h1>
    </div>

    {/* Content */}
    <div className="p-4 space-y-4 h-[600px] overflow-y-auto">
      {/* Mobile cards */}
    </div>

    {/* Bottom Navigation */}
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {navItems.map(item => (
          <button key={item.id} className="flex flex-col items-center py-2">
            <item.icon className={`w-6 h-6 ${active ? 'text-amber-500' : 'text-gray-400'}`} />
            <span className={`text-xs mt-1 ${active ? 'text-amber-500' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
</div>
```
