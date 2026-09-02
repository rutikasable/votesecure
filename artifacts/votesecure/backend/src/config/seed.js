const bcrypt = require('bcryptjs');
const { getPool, initDatabase } = require('./db');

const seed = async () => {
  console.log('🌱 Starting database seeding...');
  await initDatabase();
  const pool = getPool();

  try {
    // 1. Seed Admin & Voter Users
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const voterPasswordHash = await bcrypt.hash('voter123', 10);

    const [existingUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count === 0) {
      console.log('Inserting default users...');
      await pool.query(`
        INSERT INTO users (name, email, password, role, mobile) VALUES
        ('Alex Duarte', 'admin@votesecure.org', ?, 'admin', '+1 555 0100'),
        ('Avery Morgan', 'avery@example.org', ?, 'voter', '+1 555 0101'),
        ('Mina Park', 'mina@example.org', ?, 'voter', '+1 555 0102'),
        ('Theo Grant', 'theo@example.org', ?, 'voter', '+1 555 0103'),
        ('Sofia Nguyen', 'sofia@example.org', ?, 'voter', '+1 555 0104');
      `, [adminPasswordHash, voterPasswordHash, voterPasswordHash, voterPasswordHash, voterPasswordHash]);
    }

    // 2. Seed Elections
    const [existingElections] = await pool.query('SELECT COUNT(*) as count FROM elections');
    if (existingElections[0].count === 0) {
      console.log('Inserting default elections and candidates...');
      const [el1] = await pool.query(`
        INSERT INTO elections (title, description, start_date, end_date, status) VALUES
        ('Student Council Election 2026', 'Choose the student representatives who will help shape campus life, services, and advocacy this year.', '2026-02-12', '2026-02-28', 'active')
      `);
      const election1Id = el1.insertId;

      const [el2] = await pool.query(`
        INSERT INTO elections (title, description, start_date, end_date, status) VALUES
        ('Technology Club Election 2026', 'Select the next committee for workshops, projects, and the Technology Club community.', '2026-03-03', '2026-03-10', 'upcoming')
      `);
      const election2Id = el2.insertId;

      const [el3] = await pool.query(`
        INSERT INTO elections (title, description, start_date, end_date, status) VALUES
        ('Cultural Committee Election 2026', 'Help choose the people who will steward gatherings, grants, and cultural programming.', '2026-01-15', '2026-01-23', 'ended')
      `);
      const election3Id = el3.insertId;

      // 3. Seed Candidates
      await pool.query(`
        INSERT INTO candidates (election_id, name, party, description, color) VALUES
        (?, 'Maya Chen', 'Forward Together', 'A practical voice for transparent student representation.', '#277fa6'),
        (?, 'Jordan Brooks', 'Campus Common', 'Focused on belonging, access, and a campus that listens.', '#397c68'),
        (?, 'Samira Okafor', 'Students First', 'Making everyday student services easier to navigate.', '#bd7b43'),
        (?, 'Theo Martinez', 'Independent', 'A clear agenda for sustainable, measurable change.', '#6c6f9d'),

        (?, 'Ravi Patel', 'Build Better', 'Connecting makers with the tools and mentors to ship ideas.', '#277fa6'),
        (?, 'Elena Rossi', 'Open Source', 'A welcoming club culture with room for every skill level.', '#397c68'),
        (?, 'Noah Williams', 'Tech for Good', 'Putting technical talent to work on community needs.', '#bd7b43'),
        (?, 'Priya Shah', 'Independent', 'More workshops, better documentation, and shared ownership.', '#6c6f9d'),

        (?, 'Amina Diallo', 'Many Voices', 'Celebrating the traditions and stories that shape our community.', '#277fa6'),
        (?, 'Lucas Ferreira', 'Common Ground', 'A year-round calendar with something for everyone.', '#397c68'),
        (?, 'Grace Kim', 'Create Together', 'Supporting emerging artists and first-time event organizers.', '#bd7b43'),
        (?, 'Owen Hughes', 'Independent', 'Thoughtful programming, clear budgets, open to all.', '#6c6f9d');
      `, [
        election1Id, election1Id, election1Id, election1Id,
        election2Id, election2Id, election2Id, election2Id,
        election3Id, election3Id, election3Id, election3Id
      ]);
    }

    // 4. Seed Activities
    const [existingActivities] = await pool.query('SELECT COUNT(*) as count FROM activities');
    if (existingActivities[0].count === 0) {
      console.log('Inserting default activities...');
      await pool.query(`
        INSERT INTO activities (label, detail, timestamp, type) VALUES
        ('Ballot recorded', 'Student Council Election 2026', '8 minutes ago', 'vote'),
        ('Election published', 'Technology Club Election 2026', '2 hours ago', 'election'),
        ('New voter registered', 'Registration completed successfully', 'Yesterday', 'user'),
        ('Ballot window opened', 'Student Council Election 2026', '2 days ago', 'system');
      `);
    }

    console.log('✅ Seeding completed successfully!');
    console.log('Admin Account: admin@votesecure.org / admin123');
    console.log('Voter Account: avery@example.org / voter123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;
