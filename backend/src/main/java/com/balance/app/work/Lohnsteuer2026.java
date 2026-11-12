package com.balance.app.work;
import java.math.BigDecimal;
/** Generated from official BMF PAP 2026 (23 October 2025). See docs/work-calendar.md.
 * Tax class I only: factor f is fixed to integer 1; decimal literals use strings. */
@SuppressWarnings("deprecation")
final class Lohnsteuer2026 {
int af = 1;
int AJAHR = 0;
int ALTER1 = 0;
int ALV = 0;
int f = 1;
BigDecimal JFREIB = BigDecimal.ZERO;
BigDecimal JHINZU = BigDecimal.ZERO;
BigDecimal JRE4 = BigDecimal.ZERO;
BigDecimal JRE4ENT = BigDecimal.ZERO;
BigDecimal JVBEZ = BigDecimal.ZERO;
int KRV = 0;
BigDecimal KVZ = BigDecimal.ZERO;
int LZZ = 1;
BigDecimal LZZFREIB = BigDecimal.ZERO;
BigDecimal LZZHINZU = BigDecimal.ZERO;
BigDecimal MBV = BigDecimal.ZERO;
BigDecimal PKPV = BigDecimal.ZERO;
BigDecimal PKPVAGZ = BigDecimal.ZERO;
int PKV = 0;
BigDecimal PVA = BigDecimal.ZERO;
int PVS = 0;
int PVZ = 0;
int R = 0;
BigDecimal RE4 = BigDecimal.ZERO;
BigDecimal SONSTB = BigDecimal.ZERO;
BigDecimal SONSTENT = BigDecimal.ZERO;
BigDecimal STERBE = BigDecimal.ZERO;
int STKL = 1;
BigDecimal VBEZ = BigDecimal.ZERO;
BigDecimal VBEZM = BigDecimal.ZERO;
BigDecimal VBEZS = BigDecimal.ZERO;
BigDecimal VBS = BigDecimal.ZERO;
int VJAHR = 0;
BigDecimal ZKF = BigDecimal.ZERO;
int ZMVB = 0;
BigDecimal BK = BigDecimal.ZERO;
BigDecimal BKS = BigDecimal.ZERO;
BigDecimal LSTLZZ = BigDecimal.ZERO;
BigDecimal SOLZLZZ = BigDecimal.ZERO;
BigDecimal SOLZS = BigDecimal.ZERO;
BigDecimal STS = BigDecimal.ZERO;
BigDecimal VFRB = BigDecimal.ZERO;
BigDecimal VFRBS1 = BigDecimal.ZERO;
BigDecimal VFRBS2 = BigDecimal.ZERO;
BigDecimal WVFRB = BigDecimal.ZERO;
BigDecimal WVFRBO = BigDecimal.ZERO;
BigDecimal WVFRBM = BigDecimal.ZERO;
BigDecimal ALTE = BigDecimal.ZERO;
BigDecimal ANP = BigDecimal.ZERO;
BigDecimal ANTEIL1 = BigDecimal.ZERO;
BigDecimal AVSATZAN = BigDecimal.ZERO;
BigDecimal BBGKVPV = BigDecimal.ZERO;
BigDecimal BBGRVALV = BigDecimal.ZERO;
BigDecimal BMG = BigDecimal.ZERO;
BigDecimal DIFF = BigDecimal.ZERO;
BigDecimal EFA = BigDecimal.ZERO;
BigDecimal FVB = BigDecimal.ZERO;
BigDecimal FVBSO = BigDecimal.ZERO;
BigDecimal FVBZ = BigDecimal.ZERO;
BigDecimal FVBZSO = BigDecimal.ZERO;
BigDecimal GFB = BigDecimal.ZERO;
BigDecimal HBALTE = BigDecimal.ZERO;
BigDecimal HFVB = BigDecimal.ZERO;
BigDecimal HFVBZ = BigDecimal.ZERO;
BigDecimal HFVBZSO = BigDecimal.ZERO;
BigDecimal HOCH = BigDecimal.ZERO;
int J = 0;
BigDecimal JBMG = BigDecimal.ZERO;
BigDecimal JLFREIB = BigDecimal.ZERO;
BigDecimal JLHINZU = BigDecimal.ZERO;
BigDecimal JW = BigDecimal.ZERO;
int K = 0;
BigDecimal KFB = BigDecimal.ZERO;
BigDecimal KVSATZAN = BigDecimal.ZERO;
int KZTAB = 0;
BigDecimal LSTJAHR = BigDecimal.ZERO;
BigDecimal LSTOSO = BigDecimal.ZERO;
BigDecimal LSTSO = BigDecimal.ZERO;
BigDecimal MIST = BigDecimal.ZERO;
BigDecimal PKPVAGZJ = BigDecimal.ZERO;
BigDecimal PVSATZAN = BigDecimal.ZERO;
BigDecimal RVSATZAN = BigDecimal.ZERO;
BigDecimal RW = BigDecimal.ZERO;
BigDecimal SAP = BigDecimal.ZERO;
BigDecimal SOLZFREI = BigDecimal.ZERO;
BigDecimal SOLZJ = BigDecimal.ZERO;
BigDecimal SOLZMIN = BigDecimal.ZERO;
BigDecimal SOLZSBMG = BigDecimal.ZERO;
BigDecimal SOLZSZVE = BigDecimal.ZERO;
BigDecimal ST = BigDecimal.ZERO;
BigDecimal ST1 = BigDecimal.ZERO;
BigDecimal ST2 = BigDecimal.ZERO;
BigDecimal VBEZB = BigDecimal.ZERO;
BigDecimal VBEZBSO = BigDecimal.ZERO;
BigDecimal VERGL = BigDecimal.ZERO;
BigDecimal VSPHB = BigDecimal.ZERO;
BigDecimal VSP = BigDecimal.ZERO;
BigDecimal VSPN = BigDecimal.ZERO;
BigDecimal VSPALV = BigDecimal.ZERO;
BigDecimal VSPKVPV = BigDecimal.ZERO;
BigDecimal VSPR = BigDecimal.ZERO;
BigDecimal W1STKL5 = BigDecimal.ZERO;
BigDecimal W2STKL5 = BigDecimal.ZERO;
BigDecimal W3STKL5 = BigDecimal.ZERO;
BigDecimal X = BigDecimal.ZERO;
BigDecimal Y = BigDecimal.ZERO;
BigDecimal ZRE4 = BigDecimal.ZERO;
BigDecimal ZRE4J = BigDecimal.ZERO;
BigDecimal ZRE4VP = BigDecimal.ZERO;
BigDecimal ZRE4VPR = BigDecimal.ZERO;
BigDecimal ZTABFB = BigDecimal.ZERO;
BigDecimal ZVBEZ = BigDecimal.ZERO;
BigDecimal ZVBEZJ = BigDecimal.ZERO;
BigDecimal ZVE = BigDecimal.ZERO;
BigDecimal ZX = BigDecimal.ZERO;
BigDecimal ZZX = BigDecimal.ZERO;
static final BigDecimal[] TAB1 = {BigDecimal.ZERO, new BigDecimal("0.4"), new BigDecimal("0.384"), new BigDecimal("0.368"), new BigDecimal("0.352"), new BigDecimal("0.336"), new BigDecimal("0.32"), new BigDecimal("0.304"), new BigDecimal("0.288"), new BigDecimal("0.272"), new BigDecimal("0.256"), new BigDecimal("0.24"), new BigDecimal("0.224"), new BigDecimal("0.208"), new BigDecimal("0.192"), new BigDecimal("0.176"), new BigDecimal("0.16"), new BigDecimal("0.152"), new BigDecimal("0.144"), new BigDecimal("0.14"), new BigDecimal("0.136"), new BigDecimal("0.132"), new BigDecimal("0.128"), new BigDecimal("0.124"), new BigDecimal("0.12"), new BigDecimal("0.116"), new BigDecimal("0.112"), new BigDecimal("0.108"), new BigDecimal("0.104"), new BigDecimal("0.1"), new BigDecimal("0.096"), new BigDecimal("0.092"), new BigDecimal("0.088"), new BigDecimal("0.084"), new BigDecimal("0.08"), new BigDecimal("0.076"), new BigDecimal("0.072"), new BigDecimal("0.068"), new BigDecimal("0.064"), new BigDecimal("0.06"), new BigDecimal("0.056"), new BigDecimal("0.052"), new BigDecimal("0.048"), new BigDecimal("0.044"), new BigDecimal("0.04"), new BigDecimal("0.036"), new BigDecimal("0.032"), new BigDecimal("0.028"), new BigDecimal("0.024"), new BigDecimal("0.02"), new BigDecimal("0.016"), new BigDecimal("0.012"), new BigDecimal("0.008"), new BigDecimal("0.004"), BigDecimal.valueOf( 0)};
static final BigDecimal[] TAB2 = {BigDecimal.ZERO, BigDecimal.valueOf( 3000), BigDecimal.valueOf( 2880), BigDecimal.valueOf( 2760), BigDecimal.valueOf( 2640), BigDecimal.valueOf( 2520), BigDecimal.valueOf( 2400), BigDecimal.valueOf( 2280), BigDecimal.valueOf( 2160), BigDecimal.valueOf( 2040), BigDecimal.valueOf( 1920), BigDecimal.valueOf( 1800), BigDecimal.valueOf( 1680), BigDecimal.valueOf( 1560), BigDecimal.valueOf( 1440), BigDecimal.valueOf( 1320), BigDecimal.valueOf( 1200), BigDecimal.valueOf( 1140), BigDecimal.valueOf( 1080), BigDecimal.valueOf( 1050), BigDecimal.valueOf( 1020), BigDecimal.valueOf( 990), BigDecimal.valueOf( 960), BigDecimal.valueOf( 930), BigDecimal.valueOf( 900), BigDecimal.valueOf( 870), BigDecimal.valueOf( 840), BigDecimal.valueOf( 810), BigDecimal.valueOf( 780), BigDecimal.valueOf( 750), BigDecimal.valueOf( 720), BigDecimal.valueOf( 690), BigDecimal.valueOf( 660), BigDecimal.valueOf( 630), BigDecimal.valueOf( 600), BigDecimal.valueOf( 570), BigDecimal.valueOf( 540), BigDecimal.valueOf( 510), BigDecimal.valueOf( 480), BigDecimal.valueOf( 450), BigDecimal.valueOf( 420), BigDecimal.valueOf( 390), BigDecimal.valueOf( 360), BigDecimal.valueOf( 330), BigDecimal.valueOf( 300), BigDecimal.valueOf( 270), BigDecimal.valueOf( 240), BigDecimal.valueOf( 210), BigDecimal.valueOf( 180), BigDecimal.valueOf( 150), BigDecimal.valueOf( 120), BigDecimal.valueOf( 90), BigDecimal.valueOf( 60), BigDecimal.valueOf( 30), BigDecimal.valueOf( 0) };
static final BigDecimal[] TAB3 = {BigDecimal.ZERO, BigDecimal.valueOf( 900), BigDecimal.valueOf( 864), BigDecimal.valueOf( 828), BigDecimal.valueOf( 792), BigDecimal.valueOf( 756), BigDecimal.valueOf( 720), BigDecimal.valueOf( 684), BigDecimal.valueOf( 648), BigDecimal.valueOf( 612), BigDecimal.valueOf( 576), BigDecimal.valueOf( 540), BigDecimal.valueOf( 504), BigDecimal.valueOf( 468), BigDecimal.valueOf( 432), BigDecimal.valueOf( 396), BigDecimal.valueOf( 360), BigDecimal.valueOf( 342), BigDecimal.valueOf( 324), BigDecimal.valueOf( 315), BigDecimal.valueOf( 306), BigDecimal.valueOf( 297), BigDecimal.valueOf( 288), BigDecimal.valueOf( 279), BigDecimal.valueOf( 270), BigDecimal.valueOf( 261), BigDecimal.valueOf( 252), BigDecimal.valueOf( 243), BigDecimal.valueOf( 234), BigDecimal.valueOf( 225), BigDecimal.valueOf( 216), BigDecimal.valueOf( 207), BigDecimal.valueOf( 198), BigDecimal.valueOf( 189), BigDecimal.valueOf( 180), BigDecimal.valueOf( 171), BigDecimal.valueOf( 162), BigDecimal.valueOf( 153), BigDecimal.valueOf( 144), BigDecimal.valueOf( 135), BigDecimal.valueOf( 126), BigDecimal.valueOf( 117), BigDecimal.valueOf( 108), BigDecimal.valueOf( 99), BigDecimal.valueOf( 90), BigDecimal.valueOf( 81), BigDecimal.valueOf( 72), BigDecimal.valueOf( 63), BigDecimal.valueOf( 54), BigDecimal.valueOf( 45), BigDecimal.valueOf( 36), BigDecimal.valueOf( 27), BigDecimal.valueOf( 18), BigDecimal.valueOf( 9), BigDecimal.valueOf( 0)};
static final BigDecimal[] TAB4 = {BigDecimal.ZERO, new BigDecimal("0.4"), new BigDecimal("0.384"), new BigDecimal("0.368"), new BigDecimal("0.352"), new BigDecimal("0.336"), new BigDecimal("0.32"), new BigDecimal("0.304"), new BigDecimal("0.288"), new BigDecimal("0.272"), new BigDecimal("0.256"), new BigDecimal("0.24"), new BigDecimal("0.224"), new BigDecimal("0.208"), new BigDecimal("0.192"), new BigDecimal("0.176"), new BigDecimal("0.16"), new BigDecimal("0.152"), new BigDecimal("0.144"), new BigDecimal("0.14"), new BigDecimal("0.136"), new BigDecimal("0.132"), new BigDecimal("0.128"), new BigDecimal("0.124"), new BigDecimal("0.12"), new BigDecimal("0.116"), new BigDecimal("0.112"), new BigDecimal("0.108"), new BigDecimal("0.104"), new BigDecimal("0.1"), new BigDecimal("0.096"), new BigDecimal("0.092"), new BigDecimal("0.088"), new BigDecimal("0.084"), new BigDecimal("0.08"), new BigDecimal("0.076"), new BigDecimal("0.072"), new BigDecimal("0.068"), new BigDecimal("0.064"), new BigDecimal("0.06"), new BigDecimal("0.056"), new BigDecimal("0.052"), new BigDecimal("0.048"), new BigDecimal("0.044"), new BigDecimal("0.04"), new BigDecimal("0.036"), new BigDecimal("0.032"), new BigDecimal("0.028"), new BigDecimal("0.024"), new BigDecimal("0.02"), new BigDecimal("0.016"), new BigDecimal("0.012"), new BigDecimal("0.008"), new BigDecimal("0.004"), BigDecimal.valueOf( 0)};
static final BigDecimal[] TAB5 = {BigDecimal.ZERO, BigDecimal.valueOf( 1900), BigDecimal.valueOf( 1824), BigDecimal.valueOf( 1748), BigDecimal.valueOf( 1672), BigDecimal.valueOf( 1596), BigDecimal.valueOf( 1520), BigDecimal.valueOf( 1444), BigDecimal.valueOf( 1368), BigDecimal.valueOf( 1292), BigDecimal.valueOf( 1216), BigDecimal.valueOf( 1140), BigDecimal.valueOf( 1064), BigDecimal.valueOf( 988), BigDecimal.valueOf( 912), BigDecimal.valueOf( 836), BigDecimal.valueOf( 760), BigDecimal.valueOf( 722), BigDecimal.valueOf( 684), BigDecimal.valueOf( 665), BigDecimal.valueOf( 646), BigDecimal.valueOf( 627), BigDecimal.valueOf( 608), BigDecimal.valueOf( 589), BigDecimal.valueOf( 570), BigDecimal.valueOf( 551), BigDecimal.valueOf( 532), BigDecimal.valueOf( 513), BigDecimal.valueOf( 494), BigDecimal.valueOf( 475), BigDecimal.valueOf( 456), BigDecimal.valueOf( 437), BigDecimal.valueOf( 418), BigDecimal.valueOf( 399), BigDecimal.valueOf( 380), BigDecimal.valueOf( 361), BigDecimal.valueOf( 342), BigDecimal.valueOf( 323), BigDecimal.valueOf( 304), BigDecimal.valueOf( 285), BigDecimal.valueOf( 266), BigDecimal.valueOf( 247), BigDecimal.valueOf( 228), BigDecimal.valueOf( 209), BigDecimal.valueOf( 190), BigDecimal.valueOf( 171), BigDecimal.valueOf( 152), BigDecimal.valueOf( 133), BigDecimal.valueOf( 114), BigDecimal.valueOf( 95), BigDecimal.valueOf( 76), BigDecimal.valueOf( 57), BigDecimal.valueOf( 38), BigDecimal.valueOf( 19), BigDecimal.valueOf( 0)};
static final BigDecimal ZAHL1 = BigDecimal.ONE;
static final BigDecimal ZAHL2 = BigDecimal.valueOf(2);
static final BigDecimal ZAHL5 = BigDecimal.valueOf(5);
static final BigDecimal ZAHL7 = BigDecimal.valueOf(7);
static final BigDecimal ZAHL12 = BigDecimal.valueOf(12);
static final BigDecimal ZAHL100 = BigDecimal.valueOf(100);
static final BigDecimal ZAHL360 = BigDecimal.valueOf(360);
static final BigDecimal ZAHL500 = BigDecimal.valueOf(500);
static final BigDecimal ZAHL700 = BigDecimal.valueOf(700);
static final BigDecimal ZAHL1000 = BigDecimal.valueOf(1000);
static final BigDecimal ZAHL10000 = BigDecimal.valueOf(10000);
void calculate(){MPARA();MRE4JL();VBEZBSO= BigDecimal.ZERO;MRE4();MRE4ABZ();MBERECH();MSONST();}
void MPARA(){BBGRVALV = BigDecimal.valueOf(101400);AVSATZAN = new BigDecimal("0.013");RVSATZAN = new BigDecimal("0.093");BBGKVPV = BigDecimal.valueOf(69750);KVSATZAN = (KVZ.divide(ZAHL2).divide(ZAHL100)).add(new BigDecimal("0.07"));if(PVS == 1){PVSATZAN = new BigDecimal("0.023");}else{PVSATZAN =  new BigDecimal("0.018");}if(PVZ == 1){PVSATZAN = PVSATZAN.add(new BigDecimal("0.006"));}else{PVSATZAN = PVSATZAN.subtract(PVA.multiply(new BigDecimal("0.0025")));}W1STKL5 = BigDecimal.valueOf(14071);W2STKL5 = BigDecimal.valueOf(34939);W3STKL5 = BigDecimal.valueOf(222260);GFB = BigDecimal.valueOf(12348);SOLZFREI = BigDecimal.valueOf(20350);}
void MRE4JL(){if(LZZ == 1){ZRE4J= RE4.divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);ZVBEZJ= VBEZ.divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLFREIB= LZZFREIB.divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLHINZU= LZZHINZU.divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);}else{if(LZZ == 2){ZRE4J= (RE4.multiply (ZAHL12)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);ZVBEZJ= (VBEZ.multiply (ZAHL12)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLFREIB= (LZZFREIB.multiply (ZAHL12)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLHINZU= (LZZHINZU.multiply (ZAHL12)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);}else{if(LZZ == 3){ZRE4J= (RE4.multiply (ZAHL360)).divide (ZAHL700, 2, BigDecimal.ROUND_DOWN);ZVBEZJ= (VBEZ.multiply (ZAHL360)).divide (ZAHL700, 2, BigDecimal.ROUND_DOWN);JLFREIB= (LZZFREIB.multiply (ZAHL360)).divide (ZAHL700, 2, BigDecimal.ROUND_DOWN);JLHINZU= (LZZHINZU.multiply (ZAHL360)).divide (ZAHL700, 2, BigDecimal.ROUND_DOWN);}else{ZRE4J= (RE4.multiply (ZAHL360)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);ZVBEZJ= (VBEZ.multiply (ZAHL360)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLFREIB= (LZZFREIB.multiply (ZAHL360)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLHINZU= (LZZHINZU.multiply (ZAHL360)).divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);}}}if(af == 0){f= 1;}}
void MRE4(){if(ZVBEZJ.compareTo (BigDecimal.ZERO) == 0){FVBZ= BigDecimal.ZERO;FVB= BigDecimal.ZERO;FVBZSO= BigDecimal.ZERO;FVBSO= BigDecimal.ZERO;}else{if(VJAHR < 2006){J= 1;}else{if(VJAHR < 2058){J= VJAHR - 2004;}else{J= 54;}}if(LZZ == 1){VBEZB= (VBEZM.multiply (BigDecimal.valueOf(ZMVB))).add (VBEZS);HFVB= TAB2[J].divide (ZAHL12).multiply (BigDecimal.valueOf(ZMVB)).setScale (0, BigDecimal.ROUND_UP);FVBZ= TAB3[J].divide (ZAHL12).multiply (BigDecimal.valueOf(ZMVB)).setScale (0, BigDecimal.ROUND_UP);}else{VBEZB= ((VBEZM.multiply (ZAHL12)).add (VBEZS)).setScale (2, BigDecimal.ROUND_DOWN);HFVB= TAB2[J];FVBZ= TAB3[J];}FVB= ((VBEZB.multiply (TAB1[J]))).divide (ZAHL100).setScale (2, BigDecimal.ROUND_UP);if(FVB.compareTo (HFVB) == 1){FVB = HFVB;}if(FVB.compareTo (ZVBEZJ) == 1){FVB = ZVBEZJ;}FVBSO= (FVB.add((VBEZBSO.multiply (TAB1[J])).divide (ZAHL100))).setScale (2, BigDecimal.ROUND_UP);if(FVBSO.compareTo (TAB2[J]) == 1){FVBSO = TAB2[J];}HFVBZSO= (((VBEZB.add(VBEZBSO)).divide (ZAHL100)).subtract (FVBSO)).setScale (2, BigDecimal.ROUND_DOWN);FVBZSO= (FVBZ.add((VBEZBSO).divide (ZAHL100))).setScale (0, BigDecimal.ROUND_UP);if(FVBZSO.compareTo (HFVBZSO) == 1){FVBZSO = HFVBZSO.setScale(0, BigDecimal.ROUND_UP);}if(FVBZSO.compareTo (TAB3[J]) == 1){FVBZSO = TAB3[J];}HFVBZ= ((VBEZB.divide (ZAHL100)).subtract (FVB)).setScale (2, BigDecimal.ROUND_DOWN);if(FVBZ.compareTo (HFVBZ) == 1){FVBZ = HFVBZ.setScale (0, BigDecimal.ROUND_UP);}}MRE4ALTE();}
void MRE4ALTE(){if(ALTER1 == 0){ALTE= BigDecimal.ZERO;}else{if(AJAHR < 2006){K= 1;}else{if(AJAHR < 2058){K= AJAHR - 2004;}else{K= 54;}}BMG= ZRE4J.subtract (ZVBEZJ);ALTE = (BMG.multiply(TAB4[K])).setScale(0, BigDecimal.ROUND_UP);HBALTE= TAB5[K];if(ALTE.compareTo (HBALTE) == 1){ALTE= HBALTE;}}}
void MRE4ABZ(){ZRE4= (ZRE4J.subtract (FVB).subtract   (ALTE).subtract (JLFREIB).add (JLHINZU)).setScale (2, BigDecimal.ROUND_DOWN);if(ZRE4.compareTo (BigDecimal.ZERO) == -1){ZRE4= BigDecimal.ZERO;}ZRE4VP= ZRE4J;ZVBEZ = ZVBEZJ.subtract(FVB).setScale(2, BigDecimal.ROUND_DOWN);if(ZVBEZ.compareTo(BigDecimal.ZERO) == -1){ZVBEZ = BigDecimal.ZERO;}}
void MBERECH(){MZTABFB();VFRB = ((ANP.add(FVB.add(FVBZ))).multiply(ZAHL100)).setScale(0, BigDecimal.ROUND_DOWN);MLSTJAHR();WVFRB = ((ZVE.subtract(GFB)).multiply(ZAHL100)).setScale(0, BigDecimal.ROUND_DOWN);if(WVFRB.compareTo(BigDecimal.ZERO) == -1){WVFRB = BigDecimal.ZERO;}LSTJAHR = (ST.multiply(BigDecimal.valueOf(f))).setScale(0,BigDecimal.ROUND_DOWN);UPLSTLZZ();if(ZKF.compareTo(BigDecimal.ZERO) == 1){ZTABFB = ZTABFB.add(KFB);MRE4ABZ();MLSTJAHR();JBMG = (ST.multiply(BigDecimal.valueOf(f))).setScale(0,BigDecimal.ROUND_DOWN);}else{JBMG = LSTJAHR;}MSOLZ();}
void MZTABFB(){ANP= BigDecimal.ZERO;if(ZVBEZ.compareTo (BigDecimal.ZERO) >= 0 && ZVBEZ.compareTo(FVBZ) == -1){FVBZ = BigDecimal.valueOf(ZVBEZ.longValue());}if(STKL < 6){if(ZVBEZ.compareTo (BigDecimal.ZERO) == 1){if((ZVBEZ.subtract (FVBZ)).compareTo (BigDecimal.valueOf(102)) == -1){ANP= (ZVBEZ.subtract (FVBZ)).setScale (0, BigDecimal.ROUND_UP);}else{ANP= BigDecimal.valueOf(102);}}}else{FVBZ= BigDecimal.ZERO;FVBZSO= BigDecimal.ZERO;}if(STKL < 6){if(ZRE4.compareTo(ZVBEZ) == 1){if(ZRE4.subtract(ZVBEZ).compareTo(BigDecimal.valueOf(1230)) == -1){ANP = ANP.add(ZRE4).subtract(ZVBEZ).setScale(0,BigDecimal.ROUND_UP);}else{ANP = ANP.add(BigDecimal.valueOf(1230));}}}KZTAB= 1;if(STKL == 1){SAP= BigDecimal.valueOf(36);KFB= (ZKF.multiply (BigDecimal.valueOf(9756))).setScale (0, BigDecimal.ROUND_DOWN);}else{if(STKL == 2){EFA= BigDecimal.valueOf(4260);SAP= BigDecimal.valueOf(36);KFB= (ZKF.multiply (BigDecimal.valueOf(9756))).setScale (0, BigDecimal.ROUND_DOWN);}else{if(STKL == 3){KZTAB= 2;SAP= BigDecimal.valueOf(36);KFB= (ZKF.multiply (BigDecimal.valueOf(9756))).setScale (0, BigDecimal.ROUND_DOWN);}else{if(STKL == 4){SAP= BigDecimal.valueOf(36);KFB= (ZKF.multiply (BigDecimal.valueOf(4878))).setScale (0, BigDecimal.ROUND_DOWN);}else{if(STKL == 5){SAP= BigDecimal.valueOf(36);KFB= BigDecimal.ZERO;}else{KFB= BigDecimal.ZERO;}}}}}ZTABFB= (EFA.add (ANP).add (SAP).add (FVBZ)).setScale (2, BigDecimal.ROUND_DOWN);}
void MLSTJAHR(){UPEVP();ZVE= ZRE4.subtract (ZTABFB).subtract(VSP);UPMLST();}
void UPLSTLZZ(){JW = LSTJAHR.multiply(ZAHL100);UPANTEIL();LSTLZZ = ANTEIL1;}
void UPMLST(){if(ZVE.compareTo (ZAHL1) == -1){ZVE= BigDecimal.ZERO;X= BigDecimal.ZERO;}else{X= (ZVE.divide (BigDecimal.valueOf(KZTAB))).setScale (0, BigDecimal.ROUND_DOWN);}if(STKL < 5){UPTAB26();}else{MST5_6();}}
void UPEVP(){if(KRV == 1){VSPR = BigDecimal.ZERO;}else{if(ZRE4VP.compareTo(BBGRVALV) == 1){ZRE4VPR = BBGRVALV;}else{ZRE4VPR = ZRE4VP;}VSPR = (ZRE4VPR.multiply(RVSATZAN)).setScale(2,BigDecimal.ROUND_DOWN);}MVSPKVPV();if(ALV == 1){}else{if(STKL == 6){}else{MVSPHB();}}}
void MVSPKVPV(){if(ZRE4VP.compareTo(BBGKVPV) == 1){ZRE4VPR = BBGKVPV;}else{ZRE4VPR = ZRE4VP;}if(PKV > 0){if(STKL == 6){VSPKVPV = BigDecimal.ZERO;}else{PKPVAGZJ = PKPVAGZ.multiply(ZAHL12).divide(ZAHL100).setScale(2,BigDecimal.ROUND_DOWN);VSPKVPV = PKPV.multiply(ZAHL12).divide(ZAHL100).setScale(2, BigDecimal.ROUND_DOWN);VSPKVPV = VSPKVPV.subtract(PKPVAGZJ);if(VSPKVPV.compareTo(BigDecimal.ZERO) == -1){VSPKVPV = BigDecimal.ZERO;}}}else{VSPKVPV = ZRE4VPR.multiply(KVSATZAN.add(PVSATZAN)).setScale(2, BigDecimal.ROUND_DOWN);}VSP = VSPKVPV.add(VSPR).setScale(0, BigDecimal.ROUND_UP);}
void MVSPHB(){if(ZRE4VP.compareTo(BBGRVALV) == 1){ZRE4VPR = BBGRVALV;}else{ZRE4VPR = ZRE4VP;}VSPALV = AVSATZAN.multiply(ZRE4VPR).setScale(2, BigDecimal.ROUND_DOWN);VSPHB = VSPALV.add(VSPKVPV).setScale(2, BigDecimal.ROUND_DOWN);if(VSPHB.compareTo(BigDecimal.valueOf(1900)) == 1){VSPHB = BigDecimal.valueOf(1900);}VSPN = VSPR.add(VSPHB).setScale(0, BigDecimal.ROUND_UP);if(VSPN.compareTo(VSP) == 1){VSP = VSPN;}}
void MST5_6(){ZZX= X;if(ZZX.compareTo(W2STKL5) == 1){ZX= W2STKL5;UP5_6();if(ZZX.compareTo (W3STKL5) == 1){ST= (ST.add ((W3STKL5.subtract (W2STKL5)).multiply (new BigDecimal("0.42")))).setScale (0, BigDecimal.ROUND_DOWN);ST= (ST.add ((ZZX.subtract (W3STKL5)).multiply (new BigDecimal("0.45")))).setScale (0, BigDecimal.ROUND_DOWN);}else{ST= (ST.add ((ZZX.subtract (W2STKL5)).multiply (new BigDecimal("0.42")))).setScale (0, BigDecimal.ROUND_DOWN);}}else{ZX= ZZX;UP5_6();if(ZZX.compareTo (W1STKL5) == 1){VERGL= ST;ZX= W1STKL5;UP5_6();HOCH= (ST.add ((ZZX.subtract (W1STKL5)).multiply (new BigDecimal("0.42")))).setScale (0, BigDecimal.ROUND_DOWN);if(HOCH.compareTo (VERGL) == -1){ST= HOCH;}else{ST= VERGL;}}}}
void UP5_6(){X= (ZX.multiply (new BigDecimal("1.25"))).setScale (0, BigDecimal.ROUND_DOWN);UPTAB26();ST1= ST;X= (ZX.multiply (new BigDecimal("0.75"))).setScale (0, BigDecimal.ROUND_DOWN);UPTAB26();ST2= ST;DIFF= (ST1.subtract (ST2)).multiply (ZAHL2);MIST= (ZX.multiply (new BigDecimal("0.14"))).setScale (0, BigDecimal.ROUND_DOWN);if(MIST.compareTo (DIFF) == 1){ST= MIST;}else{ST= DIFF;}}
void MSOLZ(){SOLZFREI = (SOLZFREI.multiply(BigDecimal.valueOf(KZTAB)));if(JBMG.compareTo (SOLZFREI) == 1){SOLZJ= (JBMG.multiply (new BigDecimal("5.5"))).divide(ZAHL100).setScale(2, BigDecimal.ROUND_DOWN);SOLZMIN= (JBMG.subtract (SOLZFREI)).multiply (new BigDecimal("11.9")).divide (ZAHL100).setScale (2, BigDecimal.ROUND_DOWN);if(SOLZMIN.compareTo (SOLZJ) == -1){SOLZJ= SOLZMIN;}JW= SOLZJ.multiply (ZAHL100).setScale (0, BigDecimal.ROUND_DOWN);UPANTEIL();SOLZLZZ= ANTEIL1;}else{SOLZLZZ= BigDecimal.ZERO;}if(R > 0){JW= JBMG.multiply (ZAHL100);UPANTEIL();BK= ANTEIL1;}else{BK= BigDecimal.ZERO;}}
void UPANTEIL(){if(LZZ == 1){ANTEIL1= JW;}else{if(LZZ == 2){ANTEIL1= JW.divide (ZAHL12, 0, BigDecimal.ROUND_DOWN);}else{if(LZZ == 3){ANTEIL1= (JW.multiply (ZAHL7)).divide (ZAHL360, 0, BigDecimal.ROUND_DOWN);}else{ANTEIL1= JW.divide (ZAHL360, 0, BigDecimal.ROUND_DOWN);}}}}
void MSONST(){LZZ = 1;if(ZMVB == 0){ZMVB = 12;}if(SONSTB.compareTo (BigDecimal.ZERO) == 0 && MBV.compareTo (BigDecimal.ZERO) == 0){LSTSO= BigDecimal.ZERO;STS= BigDecimal.ZERO;SOLZS= BigDecimal.ZERO;BKS= BigDecimal.ZERO;}else{MOSONST();ZRE4J= ((JRE4.add (SONSTB)).divide (ZAHL100)).setScale (2, BigDecimal.ROUND_DOWN);ZVBEZJ= ((JVBEZ.add (VBS)).divide (ZAHL100)).setScale (2, BigDecimal.ROUND_DOWN);VBEZBSO= STERBE;MRE4SONST();MLSTJAHR();WVFRBM = (ZVE.subtract(GFB)).multiply(ZAHL100).setScale(2,BigDecimal.ROUND_DOWN);if(WVFRBM.compareTo(BigDecimal.ZERO) == -1){WVFRBM = BigDecimal.ZERO;}LSTSO= ST.multiply (ZAHL100);STS = LSTSO.subtract(LSTOSO).multiply(BigDecimal.valueOf(f)).divide(ZAHL100, 0, BigDecimal.ROUND_DOWN).multiply(ZAHL100);STSMIN();}}
void STSMIN(){if(STS.compareTo(BigDecimal.ZERO) == -1){if(MBV.compareTo(BigDecimal.ZERO) == 0){}else{LSTLZZ = LSTLZZ.add(STS);if(LSTLZZ.compareTo(BigDecimal.ZERO) == -1){LSTLZZ = BigDecimal.ZERO;}SOLZLZZ = SOLZLZZ.add(STS.multiply(new BigDecimal("5.5").divide(ZAHL100))).setScale(0, BigDecimal.ROUND_DOWN);if(SOLZLZZ.compareTo(BigDecimal.ZERO) == -1){SOLZLZZ = BigDecimal.ZERO;}BK = BK.add(STS);if(BK.compareTo(BigDecimal.ZERO) == -1){BK = BigDecimal.ZERO;}}STS = BigDecimal.ZERO;SOLZS = BigDecimal.ZERO;}else{MSOLZSTS();}if(R > 0){BKS = STS;}else{BKS = BigDecimal.ZERO;}}
void MSOLZSTS(){if(ZKF.compareTo(BigDecimal.ZERO) == 1){SOLZSZVE= ZVE.subtract(KFB);}else{SOLZSZVE= ZVE;}if(SOLZSZVE.compareTo(BigDecimal.ONE) == -1){SOLZSZVE= BigDecimal.ZERO;X= BigDecimal.ZERO;}else{X= SOLZSZVE.divide(BigDecimal.valueOf(KZTAB), 0, BigDecimal.ROUND_DOWN);}if(STKL < 5){UPTAB26();}else{MST5_6();}SOLZSBMG= ST.multiply(BigDecimal.valueOf(f)).setScale(0,BigDecimal.ROUND_DOWN);if(SOLZSBMG.compareTo(SOLZFREI) == 1){SOLZS= STS.multiply(new BigDecimal("5.5")).divide(ZAHL100, 0, BigDecimal.ROUND_DOWN);}else{SOLZS= BigDecimal.ZERO;}}
void MOSONST(){ZRE4J= (JRE4.divide (ZAHL100)).setScale (2, BigDecimal.ROUND_DOWN);ZVBEZJ= (JVBEZ.divide (ZAHL100)).setScale (2, BigDecimal.ROUND_DOWN);JLFREIB= JFREIB.divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);JLHINZU= JHINZU.divide (ZAHL100, 2, BigDecimal.ROUND_DOWN);MRE4();MRE4ABZ();ZRE4VP = ZRE4VP.subtract(JRE4ENT.divide(ZAHL100));MZTABFB();VFRBS1 = ((ANP.add(FVB.add(FVBZ))).multiply(ZAHL100)).setScale(2,BigDecimal.ROUND_DOWN);MLSTJAHR();WVFRBO = ((ZVE.subtract(GFB)).multiply(ZAHL100)).setScale(2, BigDecimal.ROUND_DOWN);if(WVFRBO.compareTo(BigDecimal.ZERO) == -1 ){WVFRBO = BigDecimal.ZERO;}LSTOSO= ST.multiply (ZAHL100);}
void MRE4SONST(){MRE4();FVB= FVBSO;MRE4ABZ();ZRE4VP = ZRE4VP.add(MBV.divide(ZAHL100)).subtract(JRE4ENT.divide(ZAHL100)).subtract(SONSTENT.divide(ZAHL100));FVBZ= FVBZSO;MZTABFB();VFRBS2 = ((((ANP.add(FVB).add(FVBZ))).multiply(ZAHL100))).subtract(VFRBS1);}
void UPTAB26(){if(X.compareTo(GFB.add(ZAHL1)) == -1){ST= BigDecimal.ZERO;}else{if(X.compareTo (BigDecimal.valueOf(17800)) == -1){Y = (X.subtract(GFB)).divide(ZAHL10000, 6,BigDecimal.ROUND_DOWN);RW= Y.multiply (new BigDecimal("914.51"));RW= RW.add (BigDecimal.valueOf(1400));ST= (RW.multiply (Y)).setScale (0, BigDecimal.ROUND_DOWN);}else{if(X.compareTo (BigDecimal.valueOf(69879)) == -1){Y= (X.subtract (BigDecimal.valueOf(17799))).divide (ZAHL10000, 6, BigDecimal.ROUND_DOWN);RW= Y.multiply (new BigDecimal("173.1"));RW= RW.add (BigDecimal.valueOf(2397));RW= RW.multiply (Y);ST= (RW.add (new BigDecimal("1034.87"))).setScale (0, BigDecimal.ROUND_DOWN);}else{if(X.compareTo (BigDecimal.valueOf(277826)) == -1){ST= ((X.multiply (new BigDecimal("0.42"))).subtract (new BigDecimal("11135.63"))).setScale (0, BigDecimal.ROUND_DOWN);}else{ST= ((X.multiply (new BigDecimal("0.45"))).subtract (new BigDecimal("19470.38"))).setScale (0, BigDecimal.ROUND_DOWN);}}}}ST= ST.multiply (BigDecimal.valueOf(KZTAB));}
}