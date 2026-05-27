import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: '总览工作台', end: true },
  { to: '/risk/queue', label: '风险审批' },
  { to: '/run-center', label: '运行中心' },
  { to: '/knowledge-assets', label: '知识资产' },
  { to: '/settings', label: '设置' },
];

export default function Layout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>⚙️ SkillForge</h1>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
