import { ControlBar, Toasts, TopBar } from './components/HUD';
import { AboutPanel, DemoPanel, HistoryPanel, InfoPanel, OfferPanel, RosterPanel, ThoughtsPanel } from './components/Panels';
import { useStore } from './simulation/store';
import { Scene } from './world/Scene';

export default function App() {
  const panel = useStore((s) => s.panel);
  const thoughtsOpen = useStore((s) => s.thoughtsOpen);
  const showreel = useStore((s) => s.showreel);
  return (
    <div className={`app ${showreel ? 'showreel' : ''}`}>
      <div className="scene"><Scene /></div>
      <div className="ui">
        <TopBar />
        <Toasts />
        <div className="left-col">
          {panel === 'roster' && <RosterPanel />}
          <InfoPanel />
        </div>
        <div className="right-col">
          {thoughtsOpen && <ThoughtsPanel />}
        </div>
        {panel === 'history' && <div className="center-modal"><HistoryPanel /></div>}
        {panel === 'offer' && <div className="center-modal"><OfferPanel /></div>}
        {panel === 'demo' && <div className="center-modal"><DemoPanel /></div>}
        {panel === 'about' && <div className="center-modal"><AboutPanel /></div>}
        <ControlBar />
      </div>
    </div>
  );
}
