const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

async function seedAdmin() {
  const adminEmail = 'admin@votesecure.org';
  const adminPassword = 'admin123';
  const adminName = 'Alex Duarte';

  console.log(`Checking for admin account: ${adminEmail}...`);

  try {
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', adminEmail)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing admin:', checkError);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (existingAdmin) {
      console.log(`Admin account exists (ID: ${existingAdmin.id}). Updating password and role...`);
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          role: 'admin',
          name: adminName,
        })
        .eq('id', existingAdmin.id);

      if (updateError) {
        console.error('Failed to update admin account:', updateError);
        process.exit(1);
      }
      console.log('Admin account successfully updated!');
    } else {
      console.log('Creating new admin account...');
      const { data: newAdmin, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create admin account:', insertError);
        process.exit(1);
      }
      console.log(`Admin account created successfully! ID: ${newAdmin.id}`);
    }

    // Also check if demo voter exists (avery@example.org / voter123)
    const voterEmail = 'avery@example.org';
    const voterPassword = 'voter123';
    const voterName = 'Avery Morgan';

    const { data: existingVoter } = await supabase
      .from('users')
      .select('id')
      .eq('email', voterEmail)
      .maybeSingle();

    if (!existingVoter) {
      const hashedVoterPassword = await bcrypt.hash(voterPassword, salt);
      await supabase.from('users').insert([
        {
          name: voterName,
          email: voterEmail,
          password: hashedVoterPassword,
          role: 'voter',
        },
      ]);
      console.log('Default voter account created: avery@example.org');
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error in seedAdmin:', err);
    process.exit(1);
  }
}

seedAdmin();
