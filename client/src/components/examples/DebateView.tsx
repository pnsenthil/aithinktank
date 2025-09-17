import { DebateView } from '../debate-view';

export default function DebateViewExample() {
  return (
    <DebateView
      onVote={(pointId, vote) => console.log(`Voted ${vote} on point ${pointId}`)}
      onViewDebateMap={() => console.log('Opening debate map')}
    />
  );
}