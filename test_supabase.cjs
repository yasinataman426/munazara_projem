const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read and parse .env manually
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file does not exist at ' + envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[match[1]] = value.trim();
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseAnonKey = envVars['VITE_SUPABASE_ANON_KEY'];

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('URL or Key missing from .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('\n--- 1. Testing user list query ---');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(3);

  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log('Users fetch success! Count:', users.length);
    console.log('Users data:', JSON.stringify(users, null, 2));
  }

  console.log('\n--- 2. Testing insert user query ---');
  const testId = 'test_' + Math.random().toString(36).substring(2, 7);
  const newUser = {
    id: testId,
    username: testId,
    full_name: 'Test user',
    phone_number: '123456789',
    email: testId + '@test.com',
    password: 'password123',
    city: 'Istanbul',
    age: 25,
    school: 'Test School',
    role: 'debater',
    status: 'rookie',
    created_at: new Date().toISOString()
  };

  const { error: insertError } = await supabase
    .from('users')
    .insert([newUser]);

  if (insertError) {
    console.error('Error inserting user:', insertError);
  } else {
    console.log('User insertion success! Inserted username:', testId);

    // Clean up
    console.log('\n--- 3. Cleaning up inserted user ---');
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.error('Error deleting test user:', deleteError);
    } else {
      console.log('Cleanup success!');
    }
  }
}

testConnection().catch(err => {
  console.error('Unexpected failure during test:', err);
});
