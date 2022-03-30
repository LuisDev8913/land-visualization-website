import React, { useCallback, useEffect, useState } from "react"
import styled from 'styled-components'
import RangeInput from 'components/RangeInput'
import { GradientButton, PrimaryButton } from 'theme'
import { useWalletModalToggle } from "state/application/hooks"
import { useWeb3React } from "@web3-react/core"
import useShiberseStakeNFT from "hooks/useShiberseStakeNFT"
import useShiberseTokenBalance from "shiba-hooks/useShiberseTokenBalance"
import { formatFromBalance, formatToBalance, parseBalance } from "utils"
import { useIsTransactionPending } from "state/transactions/hooks"
import { Dots } from "pages/Pool/styleds"
import { BigNumber } from '@ethersproject/bignumber'
import ShiboshiSelectModal from "./shiboshiSelectModal"

const ProgressCaption = styled.div`
    font-weight: 600;
    font-size: 16px;
    margin-top: 20px;
    margin-bottom: 10px;

    span {
        color: ${({theme}) => theme.brown1};
        text-transform: uppercase;
    }
`

const Parameters = styled.span`
    background: #201F31;
    border-radius: 100px;
    font-size: 18px;
    padding: 10px 20px;
    border: 1px solid #BE6D06;
`

export default function StakeShiboshi() {
    const tokenType = 'shiboshi'

    const { active, account } = useWeb3React()

    const toggleWalletModal = useWalletModalToggle()
    const { isApproved, approve, stake, stakedBalance, fetchWalletNFT } = useShiberseStakeNFT({ tokenType })

    //Token Balance
    const shibaBalanceBigInt = useShiberseTokenBalance({ tokenType })
    const shibaBalanceValue = parseFloat(formatFromBalance(shibaBalanceBigInt?.value, shibaBalanceBigInt?.decimals))
    const decimals = shibaBalanceBigInt?.decimals

    const [ showSelectModal, setShowSelectModal ] = useState(false)
    const [ lockAmount, setLockAmount ] = useState(1)
    const [ lockPeriod, setLockPeriod ] = useState(1)
    const [requestedApproval, setRequestedApproval] = useState(false)
    const [ pendingTx, setPendingTx ] = useState<string | null>(null)
    const [ myNFTs, setMyNFTs ] = useState([])
    const [ loadingNFTs, setLoadingNFTs ] = useState(true)

    const stakeLeashInfo = {
        stakeMin: 1,
        stakeMax: 10,
        dayMin: 1,
        dayMax: 100,
    }

    const isPending = useIsTransactionPending(pendingTx ?? undefined)

    const handleStake = async () => {
        const inputData = {
            amount: parseBalance(lockAmount.toString(), decimals), 
            numDaysToAdd: BigNumber.from( lockPeriod )
        }
        const tx = await stake(inputData)
        setPendingTx(tx.hash)
    }

    const handleApprove = useCallback(async () => {
        try {
            const txHash = await approve()
            // user rejected tx or didn't go thru
            if (!txHash || txHash.code !== 4001) {
                setRequestedApproval(true)
            }
        } catch (e) {
            console.log(e)
        }
    }, [approve, setRequestedApproval])

    useEffect(() => {
        const setWalletNFT = async () => {
            const result = await fetchWalletNFT()
            setMyNFTs(result as any)
            setLoadingNFTs( false )
        }

        setWalletNFT()
    }, [fetchWalletNFT])

    const handleSelectNFT = ( index: number ) => {
        const newNFTData = [ ...myNFTs ] as any
        newNFTData[index].selected = newNFTData[index].selected ? !newNFTData[index].selected : true

        setMyNFTs( newNFTData )
    }

    return (
        <>
            <div className="flex justify-around flex-wrap">
                <ProgressCaption>
                    { 'Current Balance' }:
                    <span> { `${ shibaBalanceValue } ${ tokenType }` } </span>
                </ProgressCaption>

                <ProgressCaption>
                    { 'Staked Balance' }:
                    <span> { `${ stakedBalance } ${ tokenType }` } </span>
                </ProgressCaption>
            </div>

            <div className='w-10/12 rangeBar'>
                <ProgressCaption>
                    { 'Select tokens you want to lock.' }
                </ProgressCaption>

                <GradientButton onClick={() => setShowSelectModal(prev => !prev)}>Select Tokens</GradientButton>
            </div>

            <div className='w-10/12 rangeBar'>
                <ProgressCaption>
                    { 'Locking period' }:
                    <span> { `${ lockPeriod } days` } </span>
                </ProgressCaption>

                <RangeInput 
                    min={ stakeLeashInfo.dayMin }
                    max={ stakeLeashInfo.dayMax }
                    value={ [ lockPeriod ] }
                    setValue={ setLockPeriod }
                />
            </div>

            <p className='mt-5 mb-3'>
                { `These parameters give you access to bid/purchase` }:
            </p>

            <div className='mt-6 mb-6'>
                <Parameters>
                    { '7 of max. 200 lands' }
                </Parameters>
            </div>

            <div className='w-full flex flex-row-reverse'>
                {!isApproved ? (
                    <PrimaryButton
                        className='right-0'
                        disabled={requestedApproval}
                        onClick={() => {
                            if( !active ) {
                                toggleWalletModal()
                                return
                            }
                            
                            handleApprove()
                        }}
                    >
                        { !requestedApproval ? 'APPROVE' : <Dots>APPROVING</Dots> }
                    </PrimaryButton>
                ) : (
                    <PrimaryButton 
                        className='right-0' 
                        onClick={() => {
                            if( !active ) {
                                toggleWalletModal()
                                return
                            }
                            handleStake()
                        }}
                        disabled={
                            isPending ||
                            !shibaBalanceValue ||
                            Number(lockAmount) === 0 || 
                            Number(lockPeriod) === 0 ||
                            Number(lockAmount) > Number(shibaBalanceValue)
                        }
                    >
                        { !isPending ? 'LOCK' : <Dots>LOCKING</Dots> }
                    </PrimaryButton>
                )}
                
            </div>

            <ShiboshiSelectModal 
                isOpen={ showSelectModal } 
                onDismiss={() => setShowSelectModal(prev => !prev)} 
                myNFTs={ myNFTs } 
                loadingNFTs={ loadingNFTs }
                handleSelectNFT={ handleSelectNFT }
                />
        </>
    )
}