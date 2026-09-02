/**
 * VoteSecure End-to-End Automated Test Suite
 * Tests all required API contracts across Steps 6 through 11:
 * Authentication, Elections, Candidates, Voting, Results, Authorization, and Security.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const authRoutes = require('../routes/authRoutes');
const electionRoutes = require('../routes/electionRoutes');
const candidateRoutes = require('../routes/candidateRoutes');
const voteRoutes = require('../routes/voteRoutes');
const adminRoutes = require('../routes/adminRoutes');
const { supabase } = require('../config/supabase');

// Set up in-process Express server on a test port
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

let server;

async function makeRequest(endpoint, options = {}) {
  const { method = 'GET', body, token } = options;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('Starting VoteSecure End-to-End Test Suite');
  console.log('====================================================\n');

  // Start in-memory server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  try {
    const timestamp = Date.now();
    const voter1Email = `voter_${timestamp}_1@example.org`;
    const voter2Email = `voter_${timestamp}_2@example.org`;
    const voterPassword = 'SecurePassword123!';
    const adminEmail = 'admin@votesecure.org';
    const adminPassword = 'admin123';

    let voter1Token = null;
    let voter2Token = null;
    let adminToken = null;
    let voter1Id = null;
    let testElectionId = null;
    let candidate1Id = null;
    let candidate2Id = null;

    // ----------------------------------------------------
    // SECTION 1: AUTHENTICATION TESTS
    // ----------------------------------------------------
    console.log('--- 1. Authentication Tests ---');

    // 1.1 Register valid voter
    const regRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alex Rivera',
        email: voter1Email,
        password: voterPassword,
        mobile: '+15551234567',
      },
    });
    assert(regRes.status === 201 && regRes.data.success && regRes.data.user.email === voter1Email, 'Register valid voter returns 201');
    assert(regRes.data.user && !regRes.data.user.password && !regRes.data.user.password_hash, 'Registration response never exposes password or hash');
    voter1Id = regRes.data.user.id;

    // 1.2 Register duplicate email
    const dupRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alex Rivera Duplicate',
        email: voter1Email,
        password: voterPassword,
      },
    });
    assert(dupRes.status === 409, 'Register duplicate email rejected with 409 Conflict');

    // 1.3 Register invalid email
    const invEmailRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: voterPassword,
      },
    });
    assert(invEmailRes.status === 400, 'Register invalid email rejected with 400');

    // 1.4 Register weak password (< 8 chars)
    const weakPassRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Weak Pass User',
        email: `weak_${timestamp}@example.org`,
        password: 'short',
      },
    });
    assert(weakPassRes.status === 400, 'Register weak password (< 8 chars) rejected with 400');

    // 1.5 Register second voter for duplicate vote tests
    const reg2Res = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        name: 'Sam Taylor',
        email: voter2Email,
        password: voterPassword,
      },
    });
    assert(reg2Res.status === 201, 'Register second voter returns 201');

    // 1.6 Login valid voter
    const loginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: voter1Email, password: voterPassword },
    });
    assert(loginRes.status === 200 && !!loginRes.data.token && loginRes.data.user.role === 'voter', 'Login valid voter returns 200 with JWT');
    voter1Token = loginRes.data.token;

    // 1.7 Login second voter
    const login2Res = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: voter2Email, password: voterPassword },
    });
    assert(login2Res.status === 200 && !!login2Res.data.token, 'Login second voter returns 200');
    voter2Token = login2Res.data.token;

    // 1.8 Login invalid password
    const badPassLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: voter1Email, password: 'WrongPassword999!' },
    });
    assert(badPassLogin.status === 401, 'Login with incorrect password rejected with 401');

    // 1.9 Login nonexistent user
    const noUserLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: `nonexistent_${timestamp}@example.org`, password: 'anypassword' },
    });
    assert(noUserLogin.status === 401, 'Login with nonexistent user rejected with 401');

    // 1.10 Admin login
    const adminLoginRes = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: adminPassword },
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'admin', 'Admin login returns 200 with admin role');
    adminToken = adminLoginRes.data.token;

    // 1.11 Session verification (/api/auth/me)
    const meRes = await makeRequest('/auth/me', { token: voter1Token });
    assert(meRes.status === 200 && meRes.data.user.email === voter1Email, 'GET /api/auth/me returns authenticated user session');

    // 1.12 Expired / Invalid JWT
    const badTokenRes = await makeRequest('/auth/me', { token: 'invalid.jwt.token' });
    assert(badTokenRes.status === 401, 'Request with invalid token rejected with 401');

    // ----------------------------------------------------
    // SECTION 2: ELECTION MANAGEMENT TESTS
    // ----------------------------------------------------
    console.log('\n--- 2. Election Management Tests ---');

    // 2.1 Public election listing
    const electionsRes = await makeRequest('/elections');
    assert(electionsRes.status === 200 && Array.isArray(electionsRes.data.elections), 'Public GET /api/elections returns list');

    // 2.2 Voter cannot create election (Forbidden)
    const voterCreateElec = await makeRequest('/elections', {
      method: 'POST',
      token: voter1Token,
      body: {
        title: 'Unauthorized Election',
        start_date: '2026-09-01',
        end_date: '2026-09-30',
        status: 'active',
      },
    });
    assert(voterCreateElec.status === 403, 'Voter cannot create election (403 Forbidden)');

    // 2.3 Admin creates election with invalid dates
    const badDatesElec = await makeRequest('/elections', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Bad Dates Election',
        start_date: '2026-09-30',
        end_date: '2026-09-01',
        status: 'active',
      },
    });
    assert(badDatesElec.status === 400, 'Election creation with start_date >= end_date rejected with 400');

    // 2.4 Admin creates valid active election
    const createElecRes = await makeRequest('/elections', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Test Election ${timestamp}`,
        description: 'E2E Automated Test Election',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
        status: 'active',
      },
    });
    assert(createElecRes.status === 201 && createElecRes.data.election.status === 'active', 'Admin creates active election (201 Created)');
    testElectionId = createElecRes.data.election.id;

    // 2.5 Admin updates election
    const updateElecRes = await makeRequest(`/elections/${testElectionId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        description: 'Updated description for E2E testing',
      },
    });
    assert(updateElecRes.status === 200 && updateElecRes.data.election.description.includes('Updated'), 'Admin updates election (200 OK)');

    // 2.6 View single election by ID
    const singleElecRes = await makeRequest(`/elections/${testElectionId}`);
    assert(singleElecRes.status === 200 && singleElecRes.data.election.id === testElectionId, 'GET /api/elections/:id returns election');

    // ----------------------------------------------------
    // SECTION 3: CANDIDATE MANAGEMENT TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. Candidate Management Tests ---');

    // 3.1 Voter cannot create candidate
    const voterCreateCand = await makeRequest('/candidates', {
      method: 'POST',
      token: voter1Token,
      body: {
        name: 'Unauthorized Candidate',
        election_id: testElectionId,
      },
    });
    assert(voterCreateCand.status === 403, 'Voter cannot create candidate (403 Forbidden)');

    // 3.2 Admin creates candidate with invalid election_id
    const badCandElec = await makeRequest('/candidates', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Invalid Election Candidate',
        election_id: 9999999,
      },
    });
    assert(badCandElec.status === 404 || badCandElec.status === 400, 'Candidate creation with nonexistent election rejected');

    // 3.3 Admin creates Candidate 1
    const cand1Res = await makeRequest('/candidates', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Candidate One ${timestamp}`,
        party: 'Blue Party',
        description: 'First test candidate',
        election_id: testElectionId,
      },
    });
    assert(cand1Res.status === 201 && cand1Res.data.candidate.election_id === testElectionId, 'Admin creates Candidate 1 (201 Created)');
    candidate1Id = cand1Res.data.candidate.id;

    // 3.4 Admin creates Candidate 2
    const cand2Res = await makeRequest('/candidates', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Candidate Two ${timestamp}`,
        party: 'Green Party',
        description: 'Second test candidate',
        election_id: testElectionId,
      },
    });
    assert(cand2Res.status === 201, 'Admin creates Candidate 2 (201 Created)');
    candidate2Id = cand2Res.data.candidate.id;

    // 3.5 Public get candidates by election
    const candListRes = await makeRequest(`/elections/${testElectionId}/candidates`);
    assert(candListRes.status === 200 && candListRes.data.candidates.length >= 2, 'GET /api/elections/:id/candidates returns candidates');

    // ----------------------------------------------------
    // SECTION 4: STEP 6 RESULTS TESTS (ZERO VOTES STATE)
    // ----------------------------------------------------
    console.log('\n--- 4. Results & Statistics Tests (Zero Votes) ---');

    const zeroResultsRes = await makeRequest(`/elections/${testElectionId}/results`);
    assert(zeroResultsRes.status === 200, 'GET /api/elections/:id/results returns 200 for zero-votes election');
    assert(zeroResultsRes.data.total_votes === 0, 'Total votes is correctly 0');
    assert(Array.isArray(zeroResultsRes.data.results) && zeroResultsRes.data.results.length >= 2, 'Candidates list returned with 0 tallies');
    assert(zeroResultsRes.data.results[0].vote_count === 0, 'Candidate vote count is 0');
    assert(!zeroResultsRes.data.results[0].voter_id && !zeroResultsRes.data.voter_id, 'Zero votes results never exposes voter identities');

    // 4.1 Nonexistent election results return 404
    const nonExistentResults = await makeRequest('/elections/8888888/results');
    assert(nonExistentResults.status === 404, 'GET /api/elections/:id/results returns 404 for nonexistent election');

    // ----------------------------------------------------
    // SECTION 5: VOTING & DUPLICATE PROTECTION TESTS
    // ----------------------------------------------------
    console.log('\n--- 5. Voting & Double-Vote Prevention Tests ---');

    // 5.1 Unauthenticated vote attempt rejected
    const unauthVote = await makeRequest('/votes', {
      method: 'POST',
      body: { election_id: testElectionId, candidate_id: candidate1Id },
    });
    assert(unauthVote.status === 401, 'Unauthenticated vote rejected with 401');

    // 5.2 Admin attempts to vote (Blocked by voterMiddleware)
    const adminVote = await makeRequest('/votes', {
      method: 'POST',
      token: adminToken,
      body: { election_id: testElectionId, candidate_id: candidate1Id },
    });
    assert(adminVote.status === 403, 'Admin voting rejected with 403 (Administrators forbidden from voting)');

    // 5.3 Missing election_id or candidate_id
    const missingVote = await makeRequest('/votes', {
      method: 'POST',
      token: voter1Token,
      body: { election_id: testElectionId },
    });
    assert(missingVote.status === 400, 'Vote request missing candidate_id rejected with 400');

    // 5.4 Candidate/election mismatch
    const mismatchVote = await makeRequest('/votes', {
      method: 'POST',
      token: voter1Token,
      body: { election_id: testElectionId, candidate_id: 9999999 },
    });
    assert(mismatchVote.status === 404 || mismatchVote.status === 400, 'Vote with candidate not in election rejected');

    // 5.5 Voter 1 checks vote status before voting via /api/votes/status/:electionId and /api/elections/:electionId/vote-status
    const statusBefore = await makeRequest(`/votes/status/${testElectionId}`, {
      token: voter1Token,
    });
    assert(statusBefore.status === 200 && statusBefore.data.has_voted === false, 'GET /api/votes/status/:id before voting is has_voted: false');

    // 5.6 Voter 1 casts valid vote
    const castVote1 = await makeRequest('/votes', {
      method: 'POST',
      token: voter1Token,
      body: { election_id: testElectionId, candidate_id: candidate1Id },
    });
    assert(castVote1.status === 201 && castVote1.data.success, 'Voter 1 casts vote successfully (201 Created)');

    // 5.7 Voter 1 attempts DUPLICATE VOTE in same election (Must be rejected)
    const dupVote = await makeRequest('/votes', {
      method: 'POST',
      token: voter1Token,
      body: { election_id: testElectionId, candidate_id: candidate2Id },
    });
    assert(dupVote.status === 409, 'Duplicate vote by same voter rejected with 409 Conflict');

    // 5.8 Voter 1 checks vote status after voting
    const statusAfter = await makeRequest(`/votes/status/${testElectionId}`, {
      token: voter1Token,
    });
    assert(statusAfter.status === 200 && statusAfter.data.has_voted === true, 'GET /api/votes/status/:id after voting is has_voted: true');

    // 5.9 Voter 1 checks voting history (GET /api/votes/history)
    const historyRes = await makeRequest('/votes/history', {
      token: voter1Token,
    });
    assert(historyRes.status === 200 && historyRes.data.count >= 1, 'GET /api/votes/history returns voter history');
    const myVoteRecord = historyRes.data.history.find((h) => h.election_id === testElectionId);
    assert(myVoteRecord && myVoteRecord.receipt_code.startsWith('VS-'), 'Voting history contains valid receipt code (e.g. VS-...)');
    assert(myVoteRecord && !myVoteRecord.candidate_id && !myVoteRecord.choice, 'Voting history preserves secret ballot (never exposes candidate choice)');

    // 5.10 Voter 2 casts vote for Candidate 1 as well
    const castVote2 = await makeRequest('/votes', {
      method: 'POST',
      token: voter2Token,
      body: { election_id: testElectionId, candidate_id: candidate1Id },
    });
    assert(castVote2.status === 201, 'Voter 2 casts vote successfully (201 Created)');

    // ----------------------------------------------------
    // SECTION 6: RESULTS WITH VOTES VERIFICATION
    // ----------------------------------------------------
    console.log('\n--- 6. Results with Votes Verification ---');

    const resultsWithVotes = await makeRequest(`/elections/${testElectionId}/results`);
    assert(resultsWithVotes.status === 200, 'GET /api/elections/:id/results returns 200');
    assert(resultsWithVotes.data.total_votes === 2, `Total votes tallied correctly: expected 2, got ${resultsWithVotes.data.total_votes}`);

    const c1Result = resultsWithVotes.data.results.find((c) => c.candidate_id === candidate1Id);
    const c2Result = resultsWithVotes.data.results.find((c) => c.candidate_id === candidate2Id);
    assert(c1Result && c1Result.vote_count === 2, 'Candidate 1 received 2 votes');
    assert(c2Result && c2Result.vote_count === 0, 'Candidate 2 received 0 votes');

    // Check safe percentage calculation
    const c1Percent = (c1Result.vote_count / resultsWithVotes.data.total_votes) * 100;
    const c2Percent = (c2Result.vote_count / resultsWithVotes.data.total_votes) * 100;
    assert(c1Percent === 100 && c2Percent === 0, 'Percentages calculate accurately: 100% and 0%');

    // Privacy verify: ensure results payload does NOT leak voter identities
    const jsonString = JSON.stringify(resultsWithVotes.data);
    assert(!jsonString.includes(voter1Email) && !jsonString.includes(voter2Email), 'Results response does not contain voter emails');
    assert(!jsonString.includes('"voter_id"'), 'Results response does not contain voter_id');

    // ----------------------------------------------------
    // SECTION 7: ADMIN DASHBOARD STATS & VOTERS REGISTRY
    // ----------------------------------------------------
    console.log('\n--- 7. Admin Dashboard & Registry Tests ---');

    // 7.1 Admin stats
    const statsRes = await makeRequest('/admin/stats', { token: adminToken });
    assert(statsRes.status === 200 && statsRes.data.success, 'GET /api/admin/stats returns 200');
    assert(statsRes.data.stats && typeof statsRes.data.stats.totalElections === 'number', 'Admin stats has totalElections count');
    assert(typeof statsRes.data.stats.totalVotes === 'number' && statsRes.data.stats.totalVotes >= 2, 'Admin stats has totalVotes tally');

    // 7.2 Voter cannot access admin stats
    const voterStats = await makeRequest('/admin/stats', { token: voter1Token });
    assert(voterStats.status === 403, 'Voter access to /api/admin/stats blocked with 403');

    // 7.3 Admin voters registry
    const votersRes = await makeRequest('/admin/voters', { token: adminToken });
    assert(votersRes.status === 200 && Array.isArray(votersRes.data.voters), 'GET /api/admin/voters returns voter registry');
    const v1Record = votersRes.data.voters.find((v) => v.email === voter1Email);
    assert(v1Record && v1Record.hasVoted === true, 'Admin voter registry accurately marks voter as hasVoted: true');
    assert(v1Record && !v1Record.candidate_id && !v1Record.choice, 'Admin voter registry never exposes candidate choice');

    // ----------------------------------------------------
    // SECTION 8: VOTING ON UPCOMING / ENDED ELECTIONS
    // ----------------------------------------------------
    console.log('\n--- 8. Inactive Election Voting Constraints ---');

    // 8.1 Create upcoming election
    const upcomingRes = await makeRequest('/elections', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Upcoming Election ${timestamp}`,
        start_date: '2026-11-01',
        end_date: '2026-11-30',
        status: 'upcoming',
      },
    });
    const upcomingId = upcomingRes.data.election.id;

    // Add candidate to upcoming election
    const upCandRes = await makeRequest('/candidates', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Upcoming Candidate',
        election_id: upcomingId,
      },
    });
    const upCandId = upCandRes.data.candidate.id;

    // Attempt to vote on upcoming election
    const voteUpcoming = await makeRequest('/votes', {
      method: 'POST',
      token: voter1Token,
      body: { election_id: upcomingId, candidate_id: upCandId },
    });
    assert(voteUpcoming.status === 400, 'Voting on upcoming election rejected with 400 (Not open yet)');

    // 8.2 Create ended election
    const endedRes = await makeRequest('/elections', {
      method: 'POST',
      token: adminToken,
      body: {
        title: `Ended Election ${timestamp}`,
        start_date: '2026-08-01',
        end_date: '2026-08-20',
        status: 'ended',
      },
    });
    const endedId = endedRes.data.election.id;

    const endCandRes = await makeRequest('/candidates', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Ended Candidate',
        election_id: endedId,
      },
    });
    const endCandId = endCandRes.data.candidate.id;

    // Attempt to vote on ended election
    const voteEnded = await makeRequest('/votes', {
      method: 'POST',
      token: voter1Token,
      body: { election_id: endedId, candidate_id: endCandId },
    });
    assert(voteEnded.status === 400, 'Voting on ended election rejected with 400 (Closed)');

    // ----------------------------------------------------
    // SECTION 9: CLEANUP OF TEST ARTIFACTS
    // ----------------------------------------------------
    console.log('\n--- 9. Cleanup of Test Data ---');
    // Delete test candidates & elections
    await makeRequest(`/candidates/${candidate1Id}`, { method: 'DELETE', token: adminToken });
    await makeRequest(`/candidates/${candidate2Id}`, { method: 'DELETE', token: adminToken });
    await makeRequest(`/candidates/${upCandId}`, { method: 'DELETE', token: adminToken });
    await makeRequest(`/candidates/${endCandId}`, { method: 'DELETE', token: adminToken });

    // Clean up votes from test election before deleting election
    await supabase.from('votes').delete().eq('election_id', testElectionId);
    await makeRequest(`/elections/${testElectionId}`, { method: 'DELETE', token: adminToken });
    await makeRequest(`/elections/${upcomingId}`, { method: 'DELETE', token: adminToken });
    await makeRequest(`/elections/${endedId}`, { method: 'DELETE', token: adminToken });
    console.log('  Cleaned up test candidates and elections.');

    // ----------------------------------------------------
    // SECTION 10: FRONTEND SECURITY AUDIT (SECRETS CHECK)
    // ----------------------------------------------------
    console.log('\n--- 10. Frontend Security Audit ---');
    const frontendSrcDir = path.resolve(__dirname, '../../../src');
    const frontendDistDir = path.resolve(__dirname, '../../../dist');

    function checkFilesForString(dir, forbiddenStrings) {
      if (!fs.existsSync(dir)) return [];
      const violations = [];
      const files = fs.readdirSync(dir, { recursive: true });

      for (const f of files) {
        const fullPath = path.join(dir, f.toString());
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const s of forbiddenStrings) {
            if (content.includes(s)) {
              violations.push({ file: fullPath, match: s });
            }
          }
        }
      }
      return violations;
    }

    const forbidden = [
      'SUPABASE_SERVICE_ROLE_KEY',
      'votesecure_jwt_super_secret_key_2026',
    ];

    const srcViolations = checkFilesForString(frontendSrcDir, forbidden);
    assert(srcViolations.length === 0, 'No Supabase service keys or backend JWT secret in frontend src');

    const distViolations = checkFilesForString(frontendDistDir, forbidden);
    assert(distViolations.length === 0, 'No Supabase service keys or backend JWT secret in frontend dist bundle');

  } catch (err) {
    console.error('Fatal error during E2E test execution:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    console.log('\n====================================================');
    console.log(`E2E Test Execution Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2ETests();
