'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  IconButton,
  Badge,
  Image,
  HStack,
  Avatar,
  Link,
} from '@chakra-ui/react';
import { ShoppingBag, ArrowRight, ChevronRight, Bookmark, Check, Sparkles, Tag } from 'lucide-react';
import Header from './common/Header';
import Main from './Main';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function WabaHomePage() {
  const [data, setData] = useState<any>(null);
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('전체');
  const [activeHeroPinIndex, setActiveHeroPinIndex] = useState<number>(0);

  // useEffect(() => {
  //   fetch(`${API_BASE}/api/curation/home`)
  //     .then((res) => res.json())
  //     .then((json) => setData(json))
  //     .catch((err) => console.error('Backend fetch error:', err));
  // }, []);

  // const togglePetFilter = (petType: string) => {
  //   if (petType === 'all') {
  //     setSelectedPets([]);
  //     return;
  //   }
  //   setSelectedPets((prev) =>
  //     prev.includes(petType) ? prev.filter((p) => p !== petType) : [...prev, petType]
  //   );
  // };

  // if (!data) {
  //   return (
  //     <Flex minH="100vh" align="center" justify="center" bg="waba.canvas">
  //       <Text fontWeight="600" color="waba.muted">
  //         WABA 큐레이션 데이터를 불러오는 중...
  //       </Text>
  //     </Flex>
  //   );
  // }

  // const heroLookbook = data.heroBento.mainLookbook;
  // const activePin = heroLookbook.pins[activeHeroPinIndex] || heroLookbook.pins[0];
  // const careLounge = data.heroBento.featuredCareLounge;
  // const rewardBanner = data.heroBento.rewardBanner;

  // const filteredSpaces = data.curatedSpaces.filter((space: any) => {
  //   const matchPet =
  //     selectedPets.length === 0 ||
  //     space.petTypes.some((pt: string) => selectedPets.includes(pt));
  //   const matchSpace = selectedSpace === '전체' || space.spaceCategory === selectedSpace;
  //   return matchPet && matchSpace;
  // });

  return <Main />;

  // return (
  //   <Box minH="100vh" bg="waba.canvas" pb={24}>
  //     <Header />
  //     <Container maxW="1280px" pt={28} px={6}>
  //       <Flex justify="center" mb={8}>
  //         <HStack
  //           gap={2}
  //           p={1.5}
  //           bg="white"
  //           borderRadius="full"
  //           border="1px solid"
  //           borderColor="waba.border"
  //           boxShadow="sm"
  //           flexWrap="wrap"
  //         >
  //           <Button
  //             size="sm"
  //             borderRadius="full"
  //             px={4}
  //             bg={selectedPets.length === 0 ? 'waba.charcoal' : 'transparent'}
  //             color={selectedPets.length === 0 ? 'white' : 'waba.charcoal'}
  //             _hover={{ bg: selectedPets.length === 0 ? 'waba.charcoal' : 'waba.subtle' }}
  //             onClick={() => togglePetFilter('all')}
  //           >
  //             전체
  //           </Button>
  //           {[
  //             { key: 'cat', label: '🐱 고양이' },
  //             { key: 'dog', label: '🐶 강아지' },
  //             { key: 'rabbit', label: '🐰 토끼' },
  //           ].map((pet) => {
  //             const isSelected = selectedPets.includes(pet.key);
  //             return (
  //               <Button
  //                 key={pet.key}
  //                 size="sm"
  //                 borderRadius="full"
  //                 px={4}
  //                 bg={isSelected ? 'waba.charcoal' : 'white'}
  //                 color={isSelected ? 'white' : 'waba.charcoal'}
  //                 border="1px solid"
  //                 borderColor={isSelected ? 'waba.charcoal' : 'waba.border'}
  //                 _hover={{ borderColor: 'waba.charcoal' }}
  //                 onClick={() => togglePetFilter(pet.key)}
  //               >
  //                 {pet.label}
  //                 {isSelected && <Check size={13} />}
  //               </Button>
  //             );
  //           })}
  //         </HStack>
  //       </Flex>

  //       <Grid templateColumns={{ base: '1fr', lg: 'repeat(12, 1fr)' }} gap={6} mb={16}>
  //         <GridItem
  //           colSpan={{ base: 12, lg: 8 }}
  //           position="relative"
  //           minH={{ base: '420px', lg: '540px' }}
  //           borderRadius="28px"
  //           overflow="hidden"
  //           border="1px solid"
  //           borderColor="waba.border"
  //           boxShadow="0 8px 32px -4px rgba(26, 28, 30, 0.05)"
  //           className="group"
  //         >
  //           <Image
  //             src={heroLookbook.imageUrl}
  //             alt={heroLookbook.title}
  //             w="100%"
  //             h="100%"
  //             objectFit="cover"
  //             position="absolute"
  //             inset={0}
  //             transition="transform 0.7s ease"
  //             _groupHover={{ transform: 'scale(1.03)' }}
  //           />
  //           <Box
  //             position="absolute"
  //             inset={0}
  //             bgGradient="to-t"
  //             gradientFrom="blackAlpha.600"
  //             gradientVia="blackAlpha.100"
  //             gradientTo="transparent"
  //             pointerEvents="none"
  //           />

  //           <HStack
  //             position="absolute"
  //             top={6}
  //             right={6}
  //             bg="rgba(255,255,255,0.85)"
  //             backdropFilter="blur(12px)"
  //             px={3.5}
  //             py={1.5}
  //             borderRadius="full"
  //             gap={1.5}
  //           >
  //             <Sparkles size={13} color="#6338A9" />
  //             <Text fontSize="11px" fontWeight="700" color="waba.charcoal" letterSpacing="0.04em">
  //               {heroLookbook.badge}
  //             </Text>
  //           </HStack>

  //           <HStack position="absolute" top={6} left={6} gap={2} flexWrap="wrap">
  //             {heroLookbook.pets.map((p: any) => (
  //               <Badge
  //                 key={p.id}
  //                 bg="blackAlpha.700"
  //                 color="white"
  //                 backdropFilter="blur(8px)"
  //                 fontSize="11px"
  //                 px={3}
  //                 py={1}
  //                 borderRadius="full"
  //               >
  //                 {p.label}
  //               </Badge>
  //             ))}
  //           </HStack>

  //           {heroLookbook.pins.map((pin: any, idx: number) => {
  //             const isSelectedPin = activeHeroPinIndex === idx;
  //             return (
  //               <Box
  //                 key={pin.id}
  //                 as="button"
  //                 onClick={() => setActiveHeroPinIndex(idx)}
  //                 position="absolute"
  //                 left={`${pin.x}%`}
  //                 top={`${pin.y}%`}
  //                 transform="translate(-50%, -50%)"
  //                 zIndex={20}
  //                 w="32px"
  //                 h="32px"
  //                 borderRadius="full"
  //                 bg={pin.isWabamiOfficial ? 'waba.purple' : 'waba.charcoal'}
  //                 color="white"
  //                 border="2px solid white"
  //                 boxShadow="0 4px 16px rgba(0,0,0,0.3)"
  //                 display="flex"
  //                 alignItems="center"
  //                 justifyContent="center"
  //                 transition="all 0.2s"
  //                 _hover={{ transform: 'translate(-50%, -50%) scale(1.15)' }}
  //               >
  //                 <Box
  //                   w={isSelectedPin ? '10px' : '6px'}
  //                   h={isSelectedPin ? '10px' : '6px'}
  //                   borderRadius="full"
  //                   bg="white"
  //                 />
  //               </Box>
  //             );
  //           })}

  //           <Flex
  //             position="absolute"
  //             bottom={7}
  //             left={7}
  //             right={{ base: 7, sm: 'auto' }}
  //             zIndex={15}
  //             bg="rgba(255, 255, 255, 0.90)"
  //             backdropFilter="blur(16px)"
  //             borderRadius="full"
  //             pl={5}
  //             pr={2.5}
  //             py={2.5}
  //             border="1px solid"
  //             borderColor={activePin.isWabamiOfficial ? 'waba.purple' : 'whiteAlpha.800'}
  //             boxShadow="0 12px 30px rgba(0, 0, 0, 0.18)"
  //             align="center"
  //             justify="space-between"
  //             gap={4}
  //           >
  //             <Box>
  //               <HStack gap={2}>
  //                 <Text
  //                   fontSize="11px"
  //                   fontWeight="700"
  //                   color={activePin.isWabamiOfficial ? 'waba.purple' : 'waba.muted'}
  //                 >
  //                   {activePin.brandName}
  //                 </Text>
  //                 <Text fontSize="11px" color="waba.muted">
  //                   · {activePin.petSpecNote}
  //                 </Text>
  //               </HStack>
  //               <Text fontSize="13px" fontWeight="700" color="waba.charcoal" mt={0.5}>
  //                 {activePin.productName} · {activePin.price}
  //               </Text>
  //             </Box>
  //             <IconButton
  //               aria-label="상품 보러가기"
  //               borderRadius="full"
  //               bg={activePin.isWabamiOfficial ? 'waba.purple' : 'waba.charcoal'}
  //               color="white"
  //               size="sm"
  //               w="36px"
  //               h="36px"
  //               _hover={{ opacity: 0.9 }}
  //             >
  //               <ArrowRight size={16} />
  //             </IconButton>
  //           </Flex>
  //         </GridItem>

  //         <GridItem colSpan={{ base: 12, lg: 4 }} display="flex" flexDirection="column" gap={6}>
  //           <Flex
  //             flex="1"
  //             direction="column"
  //             justify="space-between"
  //             bg="white"
  //             borderRadius="28px"
  //             p={7}
  //             border="1px solid"
  //             borderColor="waba.border"
  //             boxShadow="0 8px 32px -4px rgba(26, 28, 30, 0.04)"
  //           >
  //             <Box>
  //               <Flex align="center" justify="space-between" mb={4}>
  //                 <Text fontSize="11px" fontWeight="700" color="waba.muted" letterSpacing="0.08em">
  //                   {careLounge.categoryBadge}
  //                 </Text>
  //                 <Box w="8px" h="8px" borderRadius="full" bg="waba.purple" />
  //               </Flex>
  //               <HStack align="start" gap={4} mt={2}>
  //                 <Image
  //                   src={careLounge.thumbnailUrl}
  //                   alt={careLounge.title}
  //                   w="80px"
  //                   h="80px"
  //                   borderRadius="18px"
  //                   objectFit="cover"
  //                   flexShrink={0}
  //                 />
  //                 <Box>
  //                   <Heading
  //                     as="h3"
  //                     fontSize="17px"
  //                     fontWeight="700"
  //                     lineHeight="1.4"
  //                     color="waba.charcoal"
  //                     _hover={{ color: 'waba.purple' }}
  //                     cursor="pointer"
  //                   >
  //                     {careLounge.title}
  //                   </Heading>
  //                   <Text fontSize="13px" color="waba.muted" mt={1.5} lineClamp={2}>
  //                     {careLounge.summary}
  //                   </Text>
  //                 </Box>
  //               </HStack>
  //             </Box>

  //             <Flex
  //               align="center"
  //               justify="space-between"
  //               pt={5}
  //               mt={4}
  //               borderTop="1px solid"
  //               borderColor="waba.border"
  //             >
  //               <HStack gap={3}>
  //                 <Avatar.Root size="sm">
  //                   <Avatar.Fallback name={careLounge.author.nickname} />
  //                   <Avatar.Image src={careLounge.author.avatarUrl} />
  //                 </Avatar.Root>
  //                 <Box>
  //                   <HStack gap={1.5}>
  //                     <Text fontSize="12px" fontWeight="700" color="waba.charcoal">
  //                       {careLounge.author.nickname}
  //                     </Text>
  //                     {careLounge.author.verifiedByVet && (
  //                       <Badge bg="waba.purpleLight" color="waba.purple" fontSize="10px" px={2} py={0.5}>
  //                         ✓ 수의사 공식 검증
  //                       </Badge>
  //                     )}
  //                   </HStack>
  //                   <Text fontSize="11px" color="waba.faint">
  //                     {careLounge.author.mentorTitle}
  //                   </Text>
  //                 </Box>
  //               </HStack>
  //               <IconButton
  //                 aria-label="칼럼 읽기"
  //                 borderRadius="full"
  //                 bg="waba.subtle"
  //                 color="waba.charcoal"
  //                 size="sm"
  //                 w="38px"
  //                 h="38px"
  //                 _hover={{ bg: 'waba.charcoal', color: 'white' }}
  //               >
  //                 <ArrowRight size={16} />
  //               </IconButton>
  //             </Flex>
  //           </Flex>

  //           <Flex
  //             flex="1"
  //             direction="column"
  //             justify="space-between"
  //             bg="waba.charcoal"
  //             color="white"
  //             borderRadius="28px"
  //             p={7}
  //             position="relative"
  //             overflow="hidden"
  //           >
  //             <Box
  //               position="absolute"
  //               top="-60px"
  //               right="-60px"
  //               w="180px"
  //               h="180px"
  //               bg="waba.purple"
  //               opacity={0.3}
  //               filter="blur(50px)"
  //               borderRadius="full"
  //               pointerEvents="none"
  //             />
  //             <Box position="relative" zIndex={1}>
  //               <HStack gap={2.5} mb={3}>
  //                 <Badge bg="waba.purple" color="white" fontSize="11px" px={3} py={1} borderRadius="full">
  //                   {rewardBanner.badge}
  //                 </Badge>
  //                 <Text fontSize="11px" fontWeight="600" color="whiteAlpha.600" letterSpacing="0.08em">
  //                   {rewardBanner.subTitle}
  //                 </Text>
  //               </HStack>
  //               <Heading as="h3" fontSize="18px" fontWeight="700" lineHeight="1.5" mt={1}>
  //                 {rewardBanner.title}
  //               </Heading>
  //               <Text fontSize="13px" color="whiteAlpha.700" mt={2}>
  //                 {rewardBanner.description}
  //               </Text>
  //             </Box>
  //             <Box position="relative" zIndex={1} pt={5}>
  //               <Button
  //                 bg="white"
  //                 color="waba.charcoal"
  //                 borderRadius="full"
  //                 size="sm"
  //                 px={5}
  //                 py={5}
  //                 fontSize="12px"
  //                 _hover={{ bg: 'waba.purpleLight', color: 'waba.purple' }}
  //               >
  //                 {rewardBanner.ctaText}
  //                 <ChevronRight size={15} />
  //               </Button>
  //             </Box>
  //           </Flex>
  //         </GridItem>
  //       </Grid>

  //       <Box id="section-objects" mb={16}>
  //         <Flex
  //           direction={{ base: 'column', md: 'row' }}
  //           align={{ base: 'start', md: 'flex-end' }}
  //           justify="space-between"
  //           mb={7}
  //           gap={4}
  //         >
  //           <Box>
  //             <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.1em">
  //               VERIFIED LIVING ESSENTIALS
  //             </Text>
  //             <Heading as="h2" fontSize={{ base: '24px', md: '28px' }} fontWeight="700" mt={1}>
  //               지금 가장 많이 태그된 리빙 &amp; 케어 오브젝트
  //             </Heading>
  //             <Text fontSize="14px" color="waba.muted" mt={1}>
  //               취향 있는 집사들이 공간 룩북에 기록한 실사용 검증 아이템 (자사몰 + 스마트스토어/쿠팡 통합)
  //             </Text>
  //           </Box>
  //           <Link href="#" fontSize="13px" fontWeight="700" color="waba.charcoal">
  //             <HStack gap={1}>
  //               <Text>전체 오브젝트 보기</Text>
  //               <ArrowRight size={16} />
  //             </HStack>
  //           </Link>
  //         </Flex>

  //         <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
  //           {data.mostTaggedObjects.map((obj: any) => (
  //             <Flex
  //               key={obj.id}
  //               bg="white"
  //               borderRadius="26px"
  //               p={4}
  //               border="1px solid"
  //               borderColor="waba.border"
  //               align="center"
  //               gap={4}
  //               transition="all 0.2s"
  //               _hover={{ borderColor: 'waba.purple', boxShadow: 'md' }}
  //             >
  //               <Image
  //                 src={obj.imageUrl}
  //                 alt={obj.name}
  //                 w="92px"
  //                 h="92px"
  //                 borderRadius="18px"
  //                 objectFit="cover"
  //                 flexShrink={0}
  //               />
  //               <Box flex="1" minW={0}>
  //                 <Text fontSize="10px" fontWeight="700" color="waba.faint" letterSpacing="0.06em">
  //                   {obj.category}
  //                 </Text>
  //                 <Text fontSize="16px" fontWeight="700" color="waba.charcoal" truncate mt={0.5}>
  //                   {obj.name}
  //                 </Text>
  //                 <HStack gap={2} mt={1.5}>
  //                   <Text fontSize="14px" fontWeight="700" color="waba.charcoal">
  //                     {obj.price}
  //                   </Text>
  //                   <Badge bg="waba.purpleLight" color="waba.purple" fontSize="11px" px={2.5} py={0.5}>
  //                     🏷 태그 {obj.tagCount}회
  //                   </Badge>
  //                 </HStack>
  //               </Box>
  //               <IconButton
  //                 aria-label="장바구니"
  //                 borderRadius="full"
  //                 bg="waba.subtle"
  //                 color="waba.charcoal"
  //                 w="40px"
  //                 h="40px"
  //                 flexShrink={0}
  //                 _hover={{ bg: 'waba.charcoal', color: 'white' }}
  //               >
  //                 <ShoppingBag size={18} />
  //               </IconButton>
  //             </Flex>
  //           ))}
  //         </Grid>
  //       </Box>

  //       <Box id="section-spaces">
  //         <Flex
  //           direction={{ base: 'column', md: 'row' }}
  //           align={{ base: 'start', md: 'flex-end' }}
  //           justify="space-between"
  //           mb={7}
  //           gap={4}
  //         >
  //           <Box>
  //             <Text fontSize="11px" fontWeight="700" color="waba.purple" letterSpacing="0.1em">
  //               CURATED LOOKBOOK &amp; SPACES
  //             </Text>
  //             <Heading as="h2" fontSize={{ base: '24px', md: '28px' }} fontWeight="700" mt={1}>
  //               베스트 멘토 &amp; 라이프 스냅
  //             </Heading>
  //             <Text fontSize="14px" color="waba.muted" mt={1}>
  //               와바미 공식(AI·촬영) 룩북과 커뮤니티 기준을 통과해 승격된 집사들의 공간
  //             </Text>
  //           </Box>

  //           <HStack gap={2}>
  //             {['전체', '거실', '휴식존'].map((cat) => (
  //               <Button
  //                 key={cat}
  //                 size="sm"
  //                 borderRadius="full"
  //                 px={4}
  //                 bg={selectedSpace === cat ? 'waba.charcoal' : 'white'}
  //                 color={selectedSpace === cat ? 'white' : 'waba.muted'}
  //                 border="1px solid"
  //                 borderColor={selectedSpace === cat ? 'waba.charcoal' : 'waba.border'}
  //                 onClick={() => setSelectedSpace(cat)}
  //               >
  //                 {cat}
  //               </Button>
  //             ))}
  //           </HStack>
  //         </Flex>

  //         <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
  //           {filteredSpaces.map((snap: any) => (
  //             <Flex
  //               key={snap.id}
  //               direction="column"
  //               bg="white"
  //               borderRadius="26px"
  //               overflow="hidden"
  //               border="1px solid"
  //               borderColor="waba.border"
  //               boxShadow="0 8px 24px -4px rgba(26, 28, 30, 0.04)"
  //               className="group"
  //             >
  //               <Box position="relative" aspectRatio={4 / 5} overflow="hidden" bg="waba.subtle">
  //                 <Image
  //                   src={snap.imageUrl}
  //                   alt={snap.title}
  //                   w="100%"
  //                   h="100%"
  //                   objectFit="cover"
  //                   transition="transform 0.5s ease"
  //                   _groupHover={{ transform: 'scale(1.05)' }}
  //                 />
  //                 <Badge
  //                   position="absolute"
  //                   top={4}
  //                   left={4}
  //                   bg="blackAlpha.700"
  //                   color="white"
  //                   backdropFilter="blur(6px)"
  //                   fontSize="11px"
  //                   px={3}
  //                   py={1}
  //                   borderRadius="full"
  //                 >
  //                   {snap.petBadge}
  //                 </Badge>

  //                 <IconButton
  //                   aria-label="저장"
  //                   position="absolute"
  //                   top={4}
  //                   right={4}
  //                   size="sm"
  //                   w="36px"
  //                   h="36px"
  //                   borderRadius="full"
  //                   bg="whiteAlpha.900"
  //                   color="waba.charcoal"
  //                   _hover={{ bg: 'white', color: 'waba.purple' }}
  //                 >
  //                   <Bookmark size={16} />
  //                 </IconButton>

  //                 <Badge
  //                   position="absolute"
  //                   bottom={3}
  //                   left={4}
  //                   bg={snap.sourceType === 'USER_PROMOTED' ? 'waba.purple' : 'whiteAlpha.900'}
  //                   color={snap.sourceType === 'USER_PROMOTED' ? 'white' : 'waba.charcoal'}
  //                   fontSize="10px"
  //                   px={2.5}
  //                   py={0.5}
  //                   borderRadius="full"
  //                 >
  //                   {snap.sourceType === 'OFFICIAL_AI'
  //                     ? '✨ WABA AI 룩북'
  //                     : snap.sourceType === 'OFFICIAL_PHOTO'
  //                       ? '📸 WABA 공식 화보'
  //                       : '👑 룩북 선정 유저'}
  //                 </Badge>
  //               </Box>

  //               <Box p={5}>
  //                 <Text fontSize="13px" fontWeight="700" color="waba.charcoal" truncate>
  //                   {snap.authorHandle}
  //                 </Text>
  //                 <Text fontSize="13px" color="waba.muted" mt={1} lineClamp={1}>
  //                   {snap.title}
  //                 </Text>
  //                 <HStack
  //                   mt={3}
  //                   pt={3}
  //                   borderTop="1px solid"
  //                   borderColor="waba.border"
  //                   justify="space-between"
  //                   fontSize="11px"
  //                 >
  //                   <HStack gap={1} color="waba.purple" fontWeight="700" minW={0}>
  //                     <Tag size={12} />
  //                     <Text truncate>{snap.taggedProduct}</Text>
  //                   </HStack>
  //                   <Text color="waba.faint" flexShrink={0}>
  //                     💘 {snap.reactions?.heart || 0}
  //                   </Text>
  //                 </HStack>
  //               </Box>
  //             </Flex>
  //           ))}
  //         </Grid>
  //       </Box>
  //     </Container>
  //   </Box>
  // );
}
