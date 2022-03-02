import { Currency, ETHER, Token } from '@shibaswap/sdk'
import useDebounce from 'hooks/useDebounce'
import { useOnClickOutside } from 'hooks/useOnClickOutside'
import useTheme from 'hooks/useTheme'
import useToggle from 'hooks/useToggle'
import React, { KeyboardEvent, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Edit } from 'react-feather'
import ReactGA from 'react-ga'
import { useTranslation } from 'react-i18next'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList } from 'react-window'
import { Text } from 'rebass'
import { Field } from 'state/mint/actions'
import styled from 'styled-components'
import { useActiveWeb3React } from '../../hooks'
import { useAllTokens, useFoundOnInactiveList, useIsUserAddedToken, useToken } from '../../hooks/Tokens'
import { ButtonText, CloseIcon, IconWrapper, TYPE } from '../../theme'
import { isAddress } from '../../utils'
import Column from '../Column'
import Row, { RowBetween, RowFixed } from '../Row'
import CommonBases from './CommonBases'
import CurrencyList from './CurrencyList'
import { filterTokens, useSortedTokensByQuery } from './filtering'
import ImportRow from './ImportRow'
import { useTokenComparator } from './sorting'
import { PaddedColumn, SearchInput, Separator } from './styleds'
// import { toElastic } from 'kashi/functions'

const ContentWrapper = styled(Column)`
    width: 100%;
    flex: 1 1;
    position: relative;
`

const Footer = styled.div`
    width: 100%;
    border-radius: 10px;
    padding: 10px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    background-color: ${({ theme }) => theme.bg1};
    border-top: 1px solid ${({ theme }) => theme.bg2};
`

interface CurrencySearchProps {
    isOpen: boolean
    onDismiss: () => void
    selectedCurrency?: Currency | null
    onCurrencySelect: (currency: Currency) => void
    otherSelectedCurrency?: Currency | null
    showCommonBases?: boolean
    showManageView: () => void
    showImportView: () => void
    setImportToken: (token: Token) => void
    currenciesAB?: { [field in Field]?: Currency },
    type?: Field,
}

export function CurrencySearch({
    selectedCurrency,
    onCurrencySelect,
    otherSelectedCurrency,
    showCommonBases,
    onDismiss,
    isOpen,
    showManageView,
    showImportView,
    setImportToken,
    currenciesAB,
    type
}: CurrencySearchProps) {
    const { t } = useTranslation()
    const { chainId } = useActiveWeb3React()
    const theme = useTheme()

    // refs for fixed size lists
    const fixedList = useRef<FixedSizeList>()

    const [searchQuery, setSearchQuery] = useState<string>('')
    const debouncedQuery = useDebounce(searchQuery, 200)
    const [invertSearchOrder] = useState<boolean>(false)
    const allTokens = useAllTokens()

    // if they input an address, use it
    const isAddressSearch = isAddress(debouncedQuery)
    const searchToken = useToken(debouncedQuery)
    const searchTokenIsAdded = useIsUserAddedToken(searchToken)


    useEffect(() => {
        if (isAddressSearch) {
            ReactGA.event({
                category: 'Currency Select',
                action: 'Search by address',
                label: isAddressSearch
            })
        }
    }, [isAddressSearch])

    const showETH: boolean = useMemo(() => {
        const s = debouncedQuery.toLowerCase().trim()
        return s === '' || s === 'e' || s === 'et' || s === 'eth'
    }, [debouncedQuery])

    const tokenComparator = useTokenComparator(invertSearchOrder)

    const filteredTokens: Token[] = useMemo(() => {
        return filterTokens(Object.values(allTokens), debouncedQuery)
    }, [allTokens, debouncedQuery])

    const sortedTokens: Token[] = useMemo(() => {
        return filteredTokens.sort(tokenComparator)
    }, [filteredTokens, tokenComparator])

    const filteredSortedTokens = useSortedTokensByQuery(sortedTokens, debouncedQuery)
    // const filteredSortedTokens = fs.filter((token)=>{
    //     return filterLiquidityPairs(type, currenciesAB, token.symbol)
    // })

    const handleCurrencySelect = useCallback(
        (currency: Currency) => {
            onCurrencySelect(currency)
            onDismiss()
        },
        [onDismiss, onCurrencySelect]
    )

    // clear the input on open
    useEffect(() => {
        if (isOpen) setSearchQuery('')
    }, [isOpen])

    // manage focus on modal show
    const inputRef = useRef<HTMLInputElement>()
    const handleInput = useCallback(event => {
        const input = event.target.value
        const checksummedInput = isAddress(input)
        setSearchQuery(checksummedInput || input)
        fixedList.current?.scrollTo(0)
    }, [])

    const handleEnter = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                const s = debouncedQuery.toLowerCase().trim()
                if (s === 'eth') {
                    handleCurrencySelect(ETHER)
                } else if (filteredSortedTokens.length > 0) {
                    if (
                        filteredSortedTokens[0].symbol?.toLowerCase() === debouncedQuery.trim().toLowerCase() ||
                        filteredSortedTokens.length === 1
                    ) {
                        handleCurrencySelect(filteredSortedTokens[0])
                    }
                }
            }
        },
        [filteredSortedTokens, handleCurrencySelect, debouncedQuery]
    )

    // menu ui
    const [open, toggle] = useToggle(false)
    const node = useRef<HTMLDivElement>()
    useOnClickOutside(node, open ? toggle : undefined)

    // if no results on main list, show option to expand into inactive
    const inactiveTokens = useFoundOnInactiveList(debouncedQuery)
    const filteredInactiveTokens: Token[] = useSortedTokensByQuery(inactiveTokens, debouncedQuery)
    return (
        <ContentWrapper>
            <PaddedColumn gap="16px">
                <RowBetween>
                    <Text fontWeight={500} fontSize={16}>
                        Select a token
                    </Text>
                    <CloseIcon onClick={onDismiss} />
                </RowBetween>
                <Row>
                    <SearchInput
                        type="text"
                        className="text italic font-extrabold"
                        id="token-search-input"
                        placeholder={t('tokenSearchPlaceholder')}
                        autoComplete="off"
                        value={searchQuery}
                        ref={inputRef as RefObject<HTMLInputElement>}
                        onChange={handleInput}
                        onKeyDown={handleEnter}
                    />
                </Row>
                {showCommonBases && (
                    
                    <CommonBases
                        chainId={chainId}
                        onSelect={handleCurrencySelect}
                        selectedCurrency={selectedCurrency}
                    />
                )}
            </PaddedColumn>
            <Separator />
            {searchToken && !searchTokenIsAdded ? (
                <Column style={{ padding: '20px 0', height: '100%' }}>
                    <ImportRow token={searchToken} showImportView={showImportView} setImportToken={setImportToken} />
                </Column>
            ) : filteredSortedTokens?.length > 0 || filteredInactiveTokens?.length > 0 || showETH ? (
                <div style={{ flex: '1' }}>
                    <AutoSizer disableWidth>
                        {({ height }) => (
                            <CurrencyList
                                height={height}
                                showETH={showETH}
                                currencies={
                                    filteredInactiveTokens
                                        ? filteredSortedTokens.concat(filteredInactiveTokens)
                                        : filteredSortedTokens
                                }
                                breakIndex={
                                    inactiveTokens && filteredSortedTokens ? filteredSortedTokens.length : undefined
                                }
                                onCurrencySelect={handleCurrencySelect}
                                otherCurrency={otherSelectedCurrency}
                                selectedCurrency={selectedCurrency}
                                fixedListRef={fixedList}
                                showImportView={showImportView}
                                setImportToken={setImportToken}
                            />
                        )}
                    </AutoSizer>
                </div>
            ) : (
                <Column style={{ padding: '20px', height: '100%' }}>
                    <TYPE.main color={theme.text3} textAlign="center" mb="20px">
                        No results found.
                    </TYPE.main>
                </Column>
            )}
            <Footer>
                <Row justify="center">
                    <ButtonText onClick={showManageView} color={theme.blue1} className="list-token-manage-button">
                        <RowFixed>
                            <IconWrapper size="16px" marginRight="6px">
                                <Edit className="edit_icon"></Edit>
                            </IconWrapper>
                            <TYPE.main color={theme.blue1} style={{ color: '#fea31c' }}>Manage</TYPE.main>
                        </RowFixed>
                    </ButtonText>
                </Row>
            </Footer>
        </ContentWrapper>
    )
}
