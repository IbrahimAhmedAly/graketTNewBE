import * as readline from 'readline';

export function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

export async function confirmDataDeletion(
  dataType: string,
  itemsToDelete: string[],
): Promise<boolean> {
  console.log(
    `🚨 WARNING: This script will DELETE ALL existing ${dataType} data!`,
  );
  console.log('📋 The following data will be removed:');

  for (const item of itemsToDelete) {
    console.log(`   - ${item}`);
  }

  console.log('');
  const answer = await askQuestion('❓ Do you want to proceed? (yes/no): ');

  if (answer !== 'yes' && answer !== 'y') {
    console.log('❌ Operation cancelled by user.');
    return false;
  }

  console.log(`🔄 Proceeding with seeding ${dataType}...`);
  return true;
}
