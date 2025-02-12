#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod presale {
    use super::*;

  pub fn close(_ctx: Context<ClosePresale>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.presale.count = ctx.accounts.presale.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.presale.count = ctx.accounts.presale.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializePresale>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.presale.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializePresale<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + Presale::INIT_SPACE,
  payer = payer
  )]
  pub presale: Account<'info, Presale>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ClosePresale<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub presale: Account<'info, Presale>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub presale: Account<'info, Presale>,
}

#[account]
#[derive(InitSpace)]
pub struct Presale {
  count: u8,
}
