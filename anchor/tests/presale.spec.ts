import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {Presale} from '../target/types/presale'

describe('presale', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Presale as Program<Presale>

  const presaleKeypair = Keypair.generate()

  it('Initialize Presale', async () => {
    await program.methods
      .initialize()
      .accounts({
        presale: presaleKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([presaleKeypair])
      .rpc()

    const currentCount = await program.account.presale.fetch(presaleKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Presale', async () => {
    await program.methods.increment().accounts({ presale: presaleKeypair.publicKey }).rpc()

    const currentCount = await program.account.presale.fetch(presaleKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Presale Again', async () => {
    await program.methods.increment().accounts({ presale: presaleKeypair.publicKey }).rpc()

    const currentCount = await program.account.presale.fetch(presaleKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Presale', async () => {
    await program.methods.decrement().accounts({ presale: presaleKeypair.publicKey }).rpc()

    const currentCount = await program.account.presale.fetch(presaleKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set presale value', async () => {
    await program.methods.set(42).accounts({ presale: presaleKeypair.publicKey }).rpc()

    const currentCount = await program.account.presale.fetch(presaleKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the presale account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        presale: presaleKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.presale.fetchNullable(presaleKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
