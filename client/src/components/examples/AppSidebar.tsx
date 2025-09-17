import { AppSidebar } from '../app-sidebar';

export default function AppSidebarExample() {
  // todo: remove mock functionality
  return (
    <AppSidebar 
      currentPhase={3} 
      completedPhases={[1, 2]} 
    />
  );
}