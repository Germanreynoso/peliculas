import type { TabDef, TabId } from '../_lib/types';

interface NavbarProps {
  tabs: TabDef[];
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  onLogoClick: () => void;
}

export default function Navbar({ tabs, activeTab, onTabChange, onLogoClick }: NavbarProps) {
  return (
    <header className="navbar">
      <a
        href="#"
        className="logo"
        onClick={(e) => {
          e.preventDefault();
          onLogoClick();
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Cinema Dolphin Logo"
          style={{ height: '60px', width: '60px', borderRadius: '50%', objectFit: 'cover' }}
        />
        Cinema<span>Dolphin</span>
      </a>
      <nav>
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href="#"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(tab.id);
            }}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
