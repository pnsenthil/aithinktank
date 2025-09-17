import { SummaryView } from '../summary-view';

export default function SummaryViewExample() {
  return (
    <SummaryView
      onExport={(format) => console.log(`Exporting as ${format}`)}
      onEditSummary={(sectionId, content) => console.log(`Editing ${sectionId}:`, content)}
    />
  );
}