import React from 'react';
import {
  Menu,
  Search,
  Calculator,
  Mic,
  QrCode,
  Star,
  MessageSquare,
  Building2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useCreditCollection } from '../../context/CreditCollectionContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { resetAllMockData } = useCreditCollection();

  return (
    <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 sticky top-0 z-30 select-none shadow-sm print:hidden">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Managerium M Logo Badge */}
          <div className="w-8 h-8 rounded bg-[#1b4079] flex items-center justify-center shadow-sm relative overflow-hidden">
            <span className="text-white font-black text-lg tracking-tighter">M</span>
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-bl-sm"></div>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#1b4079]">
            MANAGERIUM
          </span>
        </div>
      </div>

      {/* Center: Search "Go to page..." */}
      <div className="hidden md:flex items-center w-80 lg:w-96 relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Go to page..."
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
        />
      </div>

      {/* Right: Quick Tools + Office + Profile */}
      <div className="flex items-center gap-2">
        {/* Reset Demo Data Button */}
        <button
          onClick={resetAllMockData}
          title="Reset Demo Mock Data"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition border border-gray-200 mr-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Reset Mock Data</span>
        </button>

        {/* Action icons */}
        <div className="hidden sm:flex items-center gap-1 text-gray-500 border-r border-gray-200 pr-2">
          <button title="Calculator" className="p-1.5 rounded hover:bg-gray-100 transition">
            <Calculator className="w-4 h-4" />
          </button>
          <button title="Voice Search" className="p-1.5 rounded hover:bg-gray-100 transition">
            <Mic className="w-4 h-4" />
          </button>
          <button title="Scan Barcode / QR" className="p-1.5 rounded hover:bg-gray-100 transition">
            <QrCode className="w-4 h-4" />
          </button>
          <button title="Favorites" className="p-1.5 rounded hover:bg-gray-100 transition">
            <Star className="w-4 h-4" />
          </button>
          <button title="Support / Chat" className="p-1.5 rounded hover:bg-gray-100 transition">
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Office Dropdown */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded cursor-pointer transition">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>FairPrice</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-1 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-semibold text-xs shadow-sm ring-2 ring-white">
            SK
          </div>
          <div className="hidden xl:block text-left text-xs leading-tight">
            <div className="font-semibold text-gray-800">Saddam Khan</div>
            <div className="text-[10px] text-gray-400">AKIJ Resource</div>
          </div>
        </div>
      </div>
    </header>
  );
};
