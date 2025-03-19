import { prisma } from '../config/prisma';

async function checkPanel() {
  const panelId = process.argv[2];
  
  if (!panelId) {
    console.error('Please provide a panel ID as an argument');
    process.exit(1);
  }

  try {
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            walletAddress: true
          }
        }
      }
    });

    if (!panel) {
      console.log(`Panel with ID ${panelId} not found in database`);
      process.exit(0);
    }

    console.log('Panel found in database:');
    console.log(JSON.stringify(panel, null, 2));
    
    // Check if blockchain data is missing
    if (!panel.blockchainPanelId || !panel.blockchainTxHash) {
      console.log('\nBlockchain data is missing or incomplete:');
      console.log(`- blockchainPanelId: ${panel.blockchainPanelId || 'Missing'}`);
      console.log(`- blockchainTxHash: ${panel.blockchainTxHash || 'Missing'}`);
      console.log(`- blockchainTokenAddress: ${panel.blockchainTokenAddress || 'Missing'}`);
    } else {
      console.log('\nBlockchain data is present:');
      console.log(`- blockchainPanelId: ${panel.blockchainPanelId}`);
      console.log(`- blockchainTxHash: ${panel.blockchainTxHash}`);
      console.log(`- blockchainTokenAddress: ${panel.blockchainTokenAddress || 'N/A'}`);
    }
  } catch (error) {
    console.error('Error checking panel:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPanel().catch(console.error); 