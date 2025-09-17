import { ProblemInput } from '../problem-input';

export default function ProblemInputExample() {
  return (
    <ProblemInput
      onSubmit={(problem) => console.log('Problem submitted:', problem)}
      onApprove={(id) => console.log('Problem approved:', id)}
    />
  );
}