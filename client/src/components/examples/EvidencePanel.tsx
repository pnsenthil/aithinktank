import { EvidencePanel } from '../evidence-panel';

export default function EvidencePanelExample() {
  return (
    <div className="h-screen bg-muted/20 relative">
      <EvidencePanel 
        isOpen={true}
        onToggle={() => console.log('Toggle evidence panel')}
      />
    </div>
  );
}