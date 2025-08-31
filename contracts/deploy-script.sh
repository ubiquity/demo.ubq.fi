PERMIT2_ADDRESS=0xd635918A75356D133d5840eE5c9ED070302C9C60 OWNER_ADDRESS=0x8cC9375CA3d23aeD4Ab4F0935F2D578548b437e3 
forge script contracts/DeployDemo.s.sol:DeployDemo \
     --rpc-url $RPC_URL \
     --broadcast \
     --private-key $DEPLOYER_PRIVATE_KEY \
     -vvvv