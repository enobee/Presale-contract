#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{ Mint, TokenAccount, TokenInterface, TransferChecked, transfer_checked };
use anchor_lang::solana_program::{
  system_instruction,
  native_token::LAMPORTS_PER_SOL,
  program::invoke,
  program::invoke_signed,
};
use chainlink_solana as chainlink;

declare_id!("HDekUEGM3hCCHGxorAdMYMhpFVSX14uqydHPHEXsuim4");

#[program]
pub mod presale{

        use std::str::FromStr;

        use super::*;

        pub fn initialize_presale(
            ctx: Context<InitializePresale>,
            stages: [Stage; 4],
            start_time: i64,
            end_time: i64
        ) -> Result<()> {

        // // Validate stages
        // for stage in stages.iter() {
        //     require!(
        //         stage.end_time > stage.start_time,
        //         ErrorCode::InvalidStageTime
        //     );
        //     require!(
        //         stage.price > 0,
        //         ErrorCode::InvalidPrice
        //     );
        // }

        // // Validate that stages are consecutive and within the presale timeframe
        // for i in 0..stages.len() - 1 {
        //     require!(
        //         stages[i].end_time == stages[i + 1].start_time,
        //         ErrorCode::NonConsecutiveStages
        //     );
        // }

        // // Validate overall presale timeframe
        // require!(
        //     stages[0].start_time == start_time,
        //     ErrorCode::InvalidStartTime
        // );
        // require!(
        //     stages[stages.len() - 1].end_time == end_time,
        //     ErrorCode::InvalidEndTime
        // );
        *ctx.accounts.presale = Presale {
            owner: ctx.accounts.owner.key(),
            start_time,
            end_time,
            stages,
            total_sol_raised: 0,
            total_usdt_raised: 0,
            total_token_sold: 0,
            current_stage_index: 0,
            token_bump: ctx.bumps.token_vault,
            token_vault : ctx.accounts.token_vault.key(),
            token_vault_balance: 0,
            token_mint: ctx.accounts.token_mint.key(),
            claim_available_time: end_time + 24 * 60 * 60,
            withdraw_available_time: end_time + 24 * 60 * 60,
            bump: ctx.bumps.presale,
        };

        Ok(())
    }

    pub fn initialize_vaults(
        ctx: Context<InitializeVaults>,
    ) -> Result<()> {
       *ctx.accounts.presale_vaults = PresaleVaults {
    
        // Initialize vaults fields
        sol_vault :ctx.accounts.sol_vault.key(),
        usdt_vault :ctx.accounts.usdt_vault.key(),
        usdt_mint :ctx.accounts.usdt_mint.key(),
        usdt_bump :ctx.bumps.usdt_vault,
        sol_bump :ctx.bumps.sol_vault,
        bump: ctx.bumps.presale_vaults

       };
    
        Ok(())
    }

    pub fn deposit_presale_tokens(ctx: Context<DepositPresaleTokens>, amount: u64) -> Result<()> {

        let presale = &mut ctx.accounts.presale;
         presale.update_current_stage()?;
        // Verify the depositor is the presale owner
        require!(
            presale.owner == ctx.accounts.owner.key(),
            ErrorCode::UnauthorizedAccess
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(
        current_time <= presale.end_time,
        ErrorCode::PresaleEnded
    );
    
        // Transfer tokens from owner to vault
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
            mint: ctx.accounts.token_mint.to_account_info(),
        };
    
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    
        transfer_checked(
            cpi_context,
            amount,
            ctx.accounts.token_mint.decimals
        )?;
        ctx.accounts.presale.token_vault_balance = ctx.accounts.presale.token_vault_balance
        .checked_add(amount)
        .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
    
        Ok(())
    }
    
    pub fn get_current_stage(ctx: Context<GetCurrentStage>) -> Result<Stage> {
        let presale = &mut ctx.accounts.presale;
        presale.update_current_stage()?;
        
        let current_stage_index: usize = presale.current_stage_index.try_into().unwrap();
        Ok(presale.stages[current_stage_index])
    }


    pub fn buy_tokens(ctx: Context<BuyTokens>, payment_method: PaymentMethod, amount: u64) -> Result<()> {
        let test_chainlink_feed: Pubkey = Pubkey::from_str("11111111111111111111111111111111").unwrap();
    
        let presale = &mut ctx.accounts.presale;
        let user_info = &mut ctx.accounts.user_info;
        let buyer = &mut ctx.accounts.buyer;
        let buyer_wallet = &mut ctx.accounts.buyer_ata;
        let destination_wallet = &mut ctx.accounts.usdt_vault;
        let sol_destination_wallet = &mut ctx.accounts.sol_vault;
        let usdt_mint = &mut ctx.accounts.usdt_mint;
       
        // Update current stage if needed
        presale.update_current_stage()?;
        // Ensure we are within the presale stage timeframe

        let current_stage_index_usize: usize = presale.current_stage_index.try_into().unwrap_or_else(|_| {
            panic!("current_stage_index is too large to fit into usize");
        });
        let current_stage = presale.stages[current_stage_index_usize];

        let current_time = Clock::get()?.unix_timestamp;
    
        require!(
            current_time >= current_stage.start_time && current_time <= current_stage.end_time,
            ErrorCode::InvalidStage
        );
    
        let token_price = current_stage.price; 

        pub const TOKEN_DECIMALS_MULTIPLIER: u128 = 1_000_000_000; // 10^9
        pub const USDT_DECIMALS_MULTIPLIER: u128 = 1_000_000;      // 10^6

        // Ensure user provides a valid amount
        require!(amount > 0, ErrorCode::InvalidAmount);
    
        let tokens_to_receive: u64 = match payment_method {
            PaymentMethod::USDT => {
                let cpi_accounts = TransferChecked {
                    from: buyer_wallet.to_account_info(),
                    to: destination_wallet.to_account_info(),
                    authority: buyer.to_account_info(),
                    mint: usdt_mint.to_account_info(),
                };
    
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    
                let decimals = ctx.accounts.usdt_mint.decimals;
    
                // Perform USDT transfer
                transfer_checked(cpi_context, amount, decimals)?;
    
                // Update presale stats
                presale.total_usdt_raised = presale.total_usdt_raised
                    .checked_add(amount)
                    .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
    
                    let tokens = (amount as u128)
                    .checked_mul(TOKEN_DECIMALS_MULTIPLIER) // 10^9 for SPL tokens
                    .and_then(|x| x.checked_div(USDT_DECIMALS_MULTIPLIER)) // 10^6 for USDT
                    .and_then(|x| x.checked_div(token_price as u128)) // Divide by price
                    .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;

                let actual_tokens = tokens
                .checked_div(TOKEN_DECIMALS_MULTIPLIER / USDT_DECIMALS_MULTIPLIER)
                .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
            actual_tokens as u64
            }
            PaymentMethod::SOL => {
                require!(
                    buyer.get_lamports() >= amount,
                    ErrorCode::InsufficientFunds
                );
    
                // let lamports_to_transfer = amount * LAMPORTS_PER_SOL;
    
                // Transfer SOL to vault
                invoke(
                    &system_instruction::transfer(
                        &buyer.key(),
                        &sol_destination_wallet.key(),
                        amount
                    ),
                    &[
                        buyer.to_account_info(),
                        sol_destination_wallet.to_account_info(),
                        ctx.accounts.system_program.to_account_info(),
                    ],
                )?;
    
                // Update presale SOL stats
                presale.total_sol_raised = presale.total_sol_raised
                    .checked_add(amount)
                    .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
    
                // Get the SOL price from Chainlink
                let sol_price_usd = if ctx.accounts.chainlink_feed.key() == test_chainlink_feed {
                    10_000_000 // Default test price (e.g., $10 per SOL)
                } else {
                    let round = chainlink::latest_round_data(
                        ctx.accounts.chainlink_program.to_account_info(),
                        ctx.accounts.chainlink_feed.to_account_info()
                    )?;
                    round.answer.try_into().unwrap_or(0u64)
                };
                msg!("SOL Price (USD): {}", sol_price_usd);
    
                let payment_in_usdt = (amount as u128)
                .checked_mul(sol_price_usd as u128) // Convert SOL to USD
                .and_then(|x| x.checked_div(LAMPORTS_PER_SOL as u128)) // Convert lamports to SOL
                .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
            
            let tokens = (payment_in_usdt as u128)
                .checked_mul(TOKEN_DECIMALS_MULTIPLIER) // Convert to SPL token units (10^9)
                .and_then(|x| x.checked_div(USDT_DECIMALS_MULTIPLIER)) // Convert USDT to dollars (10^6)
                .and_then(|x| x.checked_div(token_price as u128)) // Divide by token price
                .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
            
            let actual_tokens = tokens
            .checked_div(TOKEN_DECIMALS_MULTIPLIER / USDT_DECIMALS_MULTIPLIER)
            .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
            actual_tokens as u64
            }
        };


        msg!("Presale total tokens sold: {}", presale.total_token_sold);
        msg!("User's total purchased tokens: {}", user_info.amount_purchased);
    
        // Update presale stats
        presale.total_token_sold = presale.total_token_sold
            .checked_add(tokens_to_receive)
            .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;

            presale.token_vault_balance = presale.token_vault_balance
            .checked_sub(tokens_to_receive)
            .ok_or(ErrorCode::InsufficientVaultBalance)?;
    
    
        // Update user info
        user_info.user_wallet = ctx.accounts.buyer.key();
        user_info.amount_purchased = user_info.amount_purchased
            .checked_add(tokens_to_receive)
            .ok_or(ErrorCode::OverflowOrUnderflowOccurred)?;
        user_info.purchased_timestamp = Clock::get()?.unix_timestamp;
        user_info.has_claimed = false;
    
       
    
        Ok(())
    }
    

    pub fn claim_tokens(ctx: Context<ClaimTokens>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        let user_info = &mut ctx.accounts.user_info;
        let token_vault = &mut ctx.accounts.token_vault;
        let destination_wallet = &mut ctx.accounts.buyer_token_account;
        let token_mint = &mut ctx.accounts.token_mint;
    
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time >= presale.claim_available_time,
            ErrorCode::ClaimNotAvailableYet
        );

        require!(!user_info.has_claimed, ErrorCode::AlreadyClaimed);
        msg!("User's purchased amount: {}", user_info.amount_purchased);

        require!(user_info.amount_purchased > 0, ErrorCode::InsufficientBalance);

        let vault_balance = token_vault.amount;
        require!(vault_balance >= user_info.amount_purchased, ErrorCode::InsufficientVaultBalance);
        require!(token_mint.key() == presale.token_mint, ErrorCode::InvalidMint);

        let tokens_to_claim = user_info.amount_purchased;

        // Setup the CPI call for token transfer
        let cpi_accounts = TransferChecked {
            from: token_vault.to_account_info(),
            to: destination_wallet.to_account_info(),
            authority: presale.to_account_info(),
            mint: token_mint.to_account_info(), 
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();

        let signer_seeds: &[&[&[u8]]] = &[
           &[b"presale", &[presale.bump]]
        ];

        msg!(" Signer Seeds: {:?}", signer_seeds);
        
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);


        let decimals = token_mint.decimals;

        msg!(" Initiating token transfer...");

        // Perform the token transfer
        transfer_checked(
            cpi_context,
            tokens_to_claim,
            decimals,
        )?;
        msg!(" token successfully withdrawn!");
        presale.token_vault_balance = presale.token_vault_balance
        .checked_sub(tokens_to_claim)
        .ok_or(ErrorCode::InsufficientVaultBalance)?;


        user_info.amount_purchased = 0;
        user_info.has_claimed = true; // Mark as claimed

        Ok(())
    }


    pub fn withdraw_proceeds(ctx: Context<WithdrawProceeds>, payment_method: PaymentMethod) -> Result<()> {
    let presale = &mut ctx.accounts.presale;
    let vault = &mut ctx.accounts.presale_vaults;
    let usdt_vault = &mut ctx.accounts.usdt_vault;
    let destination_wallet = &mut ctx.accounts.owner_usdt_token;
    let sol_vault = &mut ctx.accounts.sol_vault;
    let sol_destination_wallet = &mut ctx.accounts.owner;
    let usdt_mint = &mut ctx.accounts.usdt_mint;
    let current_time = Clock::get()?.unix_timestamp; // Get the current Unix timestamp

    require!(
        current_time >= presale.withdraw_available_time,
        ErrorCode::WithdrawalNotAllowedYet
    );
    
    match payment_method {
        PaymentMethod::SOL => {
            let sol_balance = sol_vault.get_lamports();

            let vault_key = vault.key();

            let signer_seeds: &[&[&[u8]]] = &[
                &[ b"sol_vault", vault_key.as_ref(), &[vault.sol_bump]]
             ];

            require!(sol_balance > 0, ErrorCode::NoSolInVault);
            // Transfer SOL from vault to owner
            invoke_signed(
                &system_instruction::transfer(
                    &sol_vault.key(),
                    &sol_destination_wallet.key(),
                    sol_balance,
                ),
                &[
                    sol_vault.to_account_info(),
                    sol_destination_wallet.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                signer_seeds,

            )?;
        },

        PaymentMethod::USDT => {
            let presale_key = presale.key(); 
            let usdt_balance = usdt_vault.amount;
            require!(usdt_balance > 0, ErrorCode::NoUsdtInVault); 
            let cpi_accounts = TransferChecked {
                from: usdt_vault.to_account_info(),
                to: destination_wallet.to_account_info(),
                authority: vault.to_account_info(),
                mint: usdt_mint.to_account_info(), 
            };
    
            let cpi_program = ctx.accounts.token_program.to_account_info();
    
            let signer_seeds: &[&[&[u8]]] = &[
                &[b"vault", presale_key.as_ref(), &[vault.bump]]
             ];
            
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);

            let decimals = usdt_mint.decimals;

            msg!(" Initiating USDT transfer...");
    
            // Perform the USDT transfer
            transfer_checked(
                cpi_context,
                usdt_balance,
                decimals,
            )?
        }
    }
    Ok(())
    }

    pub fn withdraw_tokens(ctx: Context<WithdrawRemainingTokens>) -> Result<()> {
        let presale = &mut ctx.accounts.presale;
        let token_vault = &mut ctx.accounts.token_vault;
        let destination_wallet = &mut ctx.accounts.owner_token_account;
        let token_mint = &mut ctx.accounts.token_mint;
        require!(
            presale.owner == ctx.accounts.owner.key(),
            ErrorCode::UnauthorizedAccess
        );

        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time >= presale.withdraw_available_time,
            ErrorCode::WithdrawalNotAllowedYet
        );

        let vault_balance = token_vault.amount;

        require!(token_vault.amount > 0 , ErrorCode::InsufficientVaultBalance);
    
        // Transfer tokens from owner to vault
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.token_vault.to_account_info(),
            to: destination_wallet.to_account_info(),
            authority: presale.to_account_info(),
            mint: token_mint.to_account_info(),
        };
    
        let cpi_program = ctx.accounts.token_program.to_account_info();

        let signer_seeds: &[&[&[u8]]] = &[
                &[b"presale", &[presale.bump]]
             ];
            
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);

            let decimals = token_mint.decimals;

            msg!(" Initiating Token transfer...");
    
            // Perform the USDT transfer
            transfer_checked(
                cpi_context,
                vault_balance,
                decimals,
            )?;

            // Reset vault balance after withdrawal
            presale.token_vault_balance = 0;


        Ok(())
    }

}


#[derive(Accounts)]
pub struct InitializePresale<'info> {
    #[account(
        init, 
        payer = owner, 
        space = 8 + Presale::INIT_SPACE, 
        seeds = [b"presale"], 
        bump
    )]
    pub presale: Account<'info, Presale>,

    pub token_mint: InterfaceAccount<'info, Mint>,
	#[account(
		      init,
		      payer = owner,
		      token::mint = token_mint,
		      token::authority = presale,
		      seeds = [b"token_vault", presale.key().as_ref()],
		      bump
		  )]
	pub token_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVaults<'info> {
    // Presale account (must already exist)
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump
    )]
    pub presale: Account<'info, Presale>,

    // Vaults account
    #[account(
        init, 
        payer = owner, 
        space = 8 + PresaleVaults::INIT_SPACE,
        seeds = [b"vault", presale.key().as_ref()],
		bump
    )]
    pub presale_vaults: Account<'info, PresaleVaults>,


    // USDT Vault (holds the USDT raised)
    #[account(
        init,
        payer = owner,
        token::mint = usdt_mint,
        token::authority = presale_vaults,
        seeds = [b"usdt_vault", presale_vaults.key().as_ref()],
        bump,
    )]
    pub usdt_vault: InterfaceAccount<'info, TokenAccount>,

    // SOL Vault (holds the SOL raised)
    #[account(mut,
        seeds = [b"sol_vault", presale_vaults.key().as_ref()],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub usdt_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct GetCurrentStage<'info> {
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump,
    )]
    pub presale: Account<'info, Presale>,
}

#[derive(Accounts)]
pub struct DepositPresaleTokens<'info> {
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump,
        // has_one = owner
    )]
    pub presale: Account<'info, Presale>,

    #[account(
        mut,
        seeds = [b"token_vault", presale.key().as_ref()],
        bump = presale.token_bump
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = owner,
    
    )]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump
    )]
    pub presale: Account<'info, Presale>,

    #[account(
        seeds = [b"vault", presale.key().as_ref()],
        bump = presale_vaults.bump
    )]
    pub presale_vaults: Account<'info, PresaleVaults>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + UserInfo::INIT_SPACE,
        seeds = [b"user_info", presale.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub user_info: Account<'info, UserInfo>,

    #[account(mut,
        seeds = [b"usdt_vault", presale_vaults.key().as_ref()],
        bump = presale_vaults.usdt_bump
    )]
    pub usdt_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(address = presale_vaults.usdt_mint)]
    pub usdt_mint: InterfaceAccount<'info, Mint>,

    #[account(mut,
        associated_token::mint = usdt_mint,  // Must be same mint as USDT
        associated_token::authority = buyer  // Owned by the buyer
    )]
    pub buyer_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
        seeds = [b"sol_vault", presale_vaults.key().as_ref()],
        bump = presale_vaults.sol_bump
    )]
    pub sol_vault: SystemAccount<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: This is the Chainlink feed address, we trust this address is valid
    pub chainlink_feed: AccountInfo<'info>,
    /// CHECK: This is the Chainlink program address, we trust this address is valid
    pub chainlink_program: AccountInfo<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump
    )]
    pub presale: Account<'info, Presale>,
    #[account(
        seeds = [b"vault", presale.key().as_ref()],
        bump
    )]
    pub presale_vaults: Account<'info, PresaleVaults>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
      mut,
      seeds = [b"token_vault", presale.key().as_ref()],
      bump = presale.token_bump
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
      mut,
      seeds = [b"user_info", presale.key().as_ref(), buyer.key().as_ref()],
      bump
    )]
    pub user_info: Account<'info, UserInfo>,
  
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
        associated_token::token_program = token_program
    )]
    pub buyer_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawProceeds<'info> {
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump,
    )]
    pub presale: Account<'info, Presale>,

    #[account(mut,
        seeds = [b"vault", presale.key().as_ref()],
        bump = presale_vaults.bump
    )]
    pub presale_vaults: Account<'info, PresaleVaults>,

    #[account(mut,
        seeds = [b"sol_vault", presale_vaults.key().as_ref()],
        bump = presale_vaults.sol_bump
    )]
    pub sol_vault: SystemAccount<'info>, // Holds SOL proceeds

    #[account(mut,
        seeds = [b"usdt_vault", presale_vaults.key().as_ref()],
        bump = presale_vaults.usdt_bump
    )]
    pub usdt_vault: InterfaceAccount<'info, TokenAccount>, // Holds USDT proceeds

    #[account(mut)]
    pub owner: Signer<'info>, // The owner of the presale

    pub usdt_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = usdt_mint,
        associated_token::authority = owner
    )]
    pub owner_usdt_token: InterfaceAccount<'info, TokenAccount>, // Owner's USDT ATA

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct WithdrawRemainingTokens<'info> {
    #[account(mut,
        seeds = [b"presale"], 
        bump = presale.bump,
        constraint = presale.owner == owner.key()
    )]
    pub presale: Account<'info, Presale>,

    #[account(
        mut,
        seeds = [b"token_vault", presale.key().as_ref()],
        bump = presale.token_bump
    )]
    pub token_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = token_mint,
        associated_token::authority = owner
    )]
    pub owner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


#[account]
#[derive(InitSpace)]
pub struct Presale {
    pub owner: Pubkey,
    pub stages: [Stage; 4],
    pub total_token_sold: u64,
    pub total_usdt_raised: u64,
    pub total_sol_raised: u64,
    pub start_time: i64,
    pub current_stage_index: u64,
    pub end_time: i64,
    pub claim_available_time: i64,
    pub withdraw_available_time: i64,
    pub token_mint: Pubkey,
    pub token_vault: Pubkey,
    pub token_vault_balance: u64,
    pub token_bump: u8,
    pub bump: u8,
}

impl Presale {
    pub fn update_current_stage(&mut self) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let current_stage_index_usize: usize = self.current_stage_index.try_into().unwrap();
        
        // Check if current stage has ended
        if current_time > self.stages[current_stage_index_usize].end_time {
            // Find the next valid stage
            for i in (current_stage_index_usize + 1)..self.stages.len() {
                if current_time <= self.stages[i].end_time {
                    self.current_stage_index = i as u64;
                    return Ok(());
                }
            }
            // If we're here, we've passed all stages
            self.current_stage_index = self.stages.len() as u64;
        }
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct PresaleVaults {  
    pub sol_vault: Pubkey,
    pub usdt_vault: Pubkey,
    pub usdt_mint: Pubkey,  
    pub usdt_bump: u8, 
    pub sol_bump: u8,
    pub bump: u8
}

#[account]
#[derive(InitSpace)]
pub struct UserInfo {
	pub user_wallet: Pubkey,
	pub amount_purchased: u64,
	pub purchased_timestamp: i64,
	pub has_claimed: bool,

}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct Stage {
	pub start_time: i64, 
	pub end_time: i64,  
	pub price: u64,      
}

// Implement Space trait for Stage manually
impl Space for Stage {
    const INIT_SPACE: usize = 8 + // i64 start_time
                           8 + // i64 end_time
                           8;  // u64 price
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PaymentMethod {
    USDT,
    SOL,
}

#[error_code]
pub enum ErrorCode {
    #[msg("current presale stage is not valid.")]
    InvalidStage,

    #[msg("The provided amount is invalid.")]
    InvalidAmount,

    #[msg("Invalid SOL price retrieved from Chainlink.")]
    InvalidSolPrice,

    #[msg("Claiming is not available yet.")]
    ClaimNotAvailableYet,

    #[msg("You have already claimed your tokens.")]
    AlreadyClaimed,

    #[msg("Unauthorized access")]
    UnauthorizedAccess,

    #[msg("Insufficient balance to claim tokens.")]
    InsufficientBalance,

    #[msg("The vault does not have enough tokens to fulfill the claim.")]
    InsufficientVaultBalance,

    #[msg("Invalid mint provided.")]
    InvalidMint,

    #[msg("Withdrawals are not allowed yet.")]
    WithdrawalNotAllowedYet,

    #[msg("No SOL is available in the vault for withdrawal.")]
    NoSolInVault,

    #[msg("No USDT is available in the vault for withdrawal.")]
    NoUsdtInVault,

    #[msg("No stages provided for presale")]
    NoStagesProvided,

    #[msg("Insufficient Funds")]
    InsufficientFunds,

    #[msg("Invalid stage time configuration")]
    InvalidStageTime,

    #[msg("Invalid price configuration")]
    InvalidPrice,

    #[msg("Stages must be consecutive")]
    NonConsecutiveStages,

    #[msg("Invalid start time")]
    InvalidStartTime,

    #[msg("Presale has Ended")]
    PresaleEnded,

    #[msg("Invalid end time")]
    InvalidEndTime,

    #[msg("The operation resulted in overflow or underflow.")]
    OverflowOrUnderflowOccurred
}