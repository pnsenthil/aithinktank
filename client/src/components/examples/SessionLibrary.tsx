import { SessionLibrary } from '../session-library';

export default function SessionLibraryExample() {
  return (
    <SessionLibrary
      onViewSession={(id) => console.log('Viewing session:', id)}
      onCreateSession={() => console.log('Creating new session')}
    />
  );
}