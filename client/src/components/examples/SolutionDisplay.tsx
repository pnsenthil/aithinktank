import { SolutionDisplay } from '../solution-display';

export default function SolutionDisplayExample() {
  return (
    <SolutionDisplay
      onProceedToDebate={(id) => console.log('Proceeding to debate with solution:', id)}
      onRegenerateSolution={(id) => console.log('Regenerating solution:', id)}
      onRefineSolution={(id) => console.log('Refining solution:', id)}
    />
  );
}