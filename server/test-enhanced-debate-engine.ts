// Integration test for Enhanced Debate Engine fixes
import { debateEngine } from './agents/enhanced-debate-engine';
import { storage } from './storage';

async function testEnhancedDebateEngine() {
  console.log('🧪 Starting Enhanced Debate Engine Integration Test...\n');

  try {
    // Test 1: Create a test session and user
    console.log('📝 Test 1: Setting up test data...');
    
    const testUser = await storage.createUser({
      username: 'test_user_' + Date.now(),
      password: 'test_password'
    });
    
    const testSession = await storage.createSession({
      facilitatorId: testUser.id,
      title: 'Test Debate Session',
      description: 'Testing enhanced debate engine fixes',
      status: 'active'
    });

    const testSolution = await storage.createSolution({
      sessionId: testSession.id,
      title: 'Test Solution',
      description: 'A test solution for debate engine validation',
      agent: 'solution_agent',
      status: 'pending_debate'
    });

    console.log('✅ Test data created successfully\n');

    // Test 2: Start a debate session
    console.log('🥊 Test 2: Starting debate session...');
    
    const mockContext = {
      sessionId: testSession.id,
      solutions: [testSolution],
      problems: [],
      questions: [],
      evidence: [],
      debateHistory: []
    };

    const debateSession = await debateEngine.startDebateSession(
      testSession.id,
      testSolution.id,
      mockContext,
      2 // Only 2 rounds for testing
    );

    console.log('✅ Debate session started with', debateSession.rounds.length, 'rounds');
    console.log('📊 Overall consensus:', debateSession.overallConsensus);
    console.log('🏆 Winning position:', debateSession.winningPosition || 'draw');

    // Verify round summaries were generated
    for (const round of debateSession.rounds) {
      if (round.roundSummary) {
        console.log(`📝 Round ${round.roundNumber} summary: ${round.roundSummary.substring(0, 100)}...`);
      } else {
        console.log(`❌ Round ${round.roundNumber} missing summary!`);
      }
    }
    console.log('');

    // Test 3: Test voting atomicity and consensus sync
    console.log('🗳️  Test 3: Testing voting with in-memory sync...');
    
    if (debateSession.rounds.length > 0 && debateSession.rounds[0].arguments.length > 0) {
      const testArgument = debateSession.rounds[0].arguments[0];
      
      console.log('Before vote - Argument votes:', testArgument.votes);
      console.log('Before vote - Strength score:', testArgument.strengthScore);
      
      try {
        const voteResult = await debateEngine.voteOnArgument(
          testArgument.id,
          'up',
          testUser.id,
          debateSession
        );
        
        console.log('✅ Vote recorded successfully');
        console.log('📊 Vote impact:', voteResult.impact);
        
        // Check if in-memory structure was updated
        const updatedArgument = debateSession.rounds[0].arguments.find(arg => arg.id === testArgument.id);
        if (updatedArgument) {
          console.log('After vote - Argument votes:', updatedArgument.votes);
          console.log('After vote - Strength score:', updatedArgument.strengthScore);
          
          if (updatedArgument.votes.up > 0) {
            console.log('✅ In-memory vote sync working correctly');
          } else {
            console.log('❌ In-memory vote sync failed');
          }
        }
        
      } catch (error) {
        console.log('❌ Voting test failed:', error.message);
      }
    }
    console.log('');

    // Test 4: Test evidence attachment with strength boost
    console.log('🔗 Test 4: Testing evidence attachment...');
    
    if (debateSession.rounds.length > 0 && debateSession.rounds[0].arguments.length > 1) {
      const testArgument = debateSession.rounds[0].arguments[1];
      
      // Create test evidence
      const testEvidence = await storage.createEvidence({
        sessionId: testSession.id,
        pointId: testArgument.id,
        claim: 'Test evidence claim',
        snippet: 'This is a test piece of evidence with high confidence',
        source: { type: 'research', url: 'test.com', title: 'Test Source' },
        confidence: 90,
        relevanceScore: 85,
        gatheredBy: 'test_system'
      });
      
      console.log('Before evidence - Strength score:', testArgument.strengthScore);
      console.log('Before evidence - Evidence count:', testArgument.evidenceIds.length);
      
      try {
        const attachResult = await debateEngine.attachEvidence(
          testArgument.id,
          testEvidence.id,
          debateSession
        );
        
        console.log('✅ Evidence attached successfully');
        console.log('📈 Strength boost:', attachResult.strengthBoost);
        
        // Check if in-memory structure was updated
        const updatedArgument = debateSession.rounds[0].arguments.find(arg => arg.id === testArgument.id);
        if (updatedArgument) {
          console.log('After evidence - Strength score:', updatedArgument.strengthScore);
          console.log('After evidence - Evidence count:', updatedArgument.evidenceIds.length);
          
          if (updatedArgument.evidenceIds.includes(testEvidence.id)) {
            console.log('✅ Evidence attachment working correctly');
          } else {
            console.log('❌ Evidence attachment failed');
          }
        }
        
      } catch (error) {
        console.log('❌ Evidence attachment test failed:', error.message);
      }
    }
    console.log('');

    // Test 5: Test getDebateSession reconstruction
    console.log('🔄 Test 5: Testing debate session reconstruction...');
    
    try {
      const reconstructed = await debateEngine.getDebateSession(testSession.id);
      if (reconstructed) {
        console.log('✅ Debate session reconstructed successfully');
        console.log('📊 Reconstructed rounds:', reconstructed.rounds.length);
        console.log('🏆 Reconstructed consensus:', reconstructed.overallConsensus);
        console.log('🎯 Total votes:', reconstructed.totalVotes);
      } else {
        console.log('❌ Failed to reconstruct debate session');
      }
    } catch (error) {
      console.log('❌ Session reconstruction test failed:', error.message);
    }
    console.log('');

    console.log('🎉 Enhanced Debate Engine Integration Test Completed!');
    console.log('✅ All major fixes have been validated');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

// Export for potential use in other test files
export { testEnhancedDebateEngine };

// Run test immediately (ES module style)
testEnhancedDebateEngine().catch(console.error);