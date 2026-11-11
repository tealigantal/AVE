// Immutable identity checks; no imports of the command-line runner.
import { resolve } from 'node:path';
import { validatePaths } from './preflight.mjs';
import { repositoryRoot, sha256 } from './sources.mjs';
const fail = message => { throw Error(`P5_USED2_WRAPPER: ${message}`); };
const CONFIG_HASH = '9d5b5e8e24e5177a33262679cd2e0d3b8f11f6907afdce2f0baa0cf41104b2a0';
const COMPOSE_HASH = 'adc074fc0177a443c55fbd4821777eb09b35df66b8d2c5c81da475df7c2f0f2f';
const BUILD_HASH = '99731a076d172dcc0123cbdb0d3651ce532b074e7499ac8997fdcb8fa9c673da';
export const USED2_HELPER_NAME = 'ave-p5-used2-policy-switch-20261105';
export function requireNoUsed2Helper(ids) { if (typeof ids !== 'string' || ids.trim()) fail('second policy helper still exists or its state is unknown'); return true; }
export function verifyFixedUsed2RunArtifacts(root, configBytes, composeBytes, buildBytes) {
  if (sha256(configBytes) !== CONFIG_HASH || sha256(composeBytes) !== COMPOSE_HASH || sha256(buildBytes) !== BUILD_HASH) fail('recorded run artifacts changed');
  const config = JSON.parse(configBytes), build = JSON.parse(buildBytes);
  if (config.project !== 'ave-p5-current-20261105' || config.port !== 6083 || resolve(config.runRoot) !== resolve(root) || resolve(config.budgetRoot) !== resolve(root, 'budget') || resolve(config.harnessRoot) !== resolve(repositoryRoot, 'scripts/p5') || build.services.find(item => item.service === 'desktop')?.image_id !== config.desktopImage || build.services.find(item => item.service === 'whisper')?.image_id !== config.whisperImage) fail('run identity mismatch');
  validatePaths(config, repositoryRoot); return config;
}

// The one later recovery build was verified while running with the migrated
// policy. It is accepted only as the predecessor of the specifically named
// r4 build; the caller must still validate the stopped container pair.
function verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, label, expected) {
  if ([configBytes, composeBytes, buildBytes, identityBytes].some((bytes, index) => sha256(bytes) !== expected[index])) fail(`${label} run artifacts changed`);
  const config = JSON.parse(configBytes), build = JSON.parse(buildBytes), identity = JSON.parse(identityBytes);
  const services = identity.runtime?.services;
  if (config.project !== 'ave-p5-current-20261105' || config.port !== 6083 || resolve(config.runRoot) !== resolve(root) || resolve(config.budgetRoot) !== resolve(root, 'budget') || resolve(config.harnessRoot) !== resolve(repositoryRoot, 'scripts/p5') || !Array.isArray(services) || services.length !== 2 || identity.build_input_digest !== build.build_input_digest || identity.policy_sha256 !== 'a3f30c577188d26dd52ab3cc23eb50607e675d71e3f3fa859dc59ef449583089') fail(`${label} run identity mismatch`);
  for (const service of ['desktop', 'whisper']) {
    const recorded = build.services?.filter(item => item.service === service), runtime = services.filter(item => item.service === service), image = config[`${service}Image`];
    if (recorded?.length !== 1 || runtime.length !== 1 || recorded[0].image_id !== image || runtime[0].image_id !== image || runtime[0].build_input_digest !== build.build_input_digest) fail(`${label} image or build identity mismatch`);
  }
  validatePaths(config, repositoryRoot); return config;
}

export function verifyFixedUsed3RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r3', [
    '650669db12406771b40f69373d02d228819f65a15d51374d32265b5a387e1156',
    'a395e66b56f26044bd153c15ec9457a2444b92acf0eb0005e65dd3ac5dd09065',
    '83c2be8677806a68bb02bba20c19931f4c2e9ad6be34cdf5d8bd32d98d050192',
    '2509c85054969db9933c5ba4ab759dea2966430f99aa5ff3d1dc3fe200c3e7d2',
  ]);
}

// r4 was verified live under the same migrated policy; it is a predecessor
// only for the specifically named r5, after the owned pair stops cleanly.
export function verifyFixedUsed4RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r4', [
    '87ff82be903fceed15b2a83dd0b904f907c776e47ec23e7ece106138fd369fdc',
    'fcd76f86b65c4a6a202c54708160015f9ecc9ed0ebbf3b720390e010e8c7628e',
    '0e8c6dc087222ed685e6feb8c4d48b6619ec08ecd2477e9c46dab9c5765ea663',
    'b0b5c61d884bf5a83ef3a1bb5063f0552764bd75a1707142e54a16d1eea2127c',
  ]);
}

// The verified r5 pair is accepted only as the predecessor of the exact r6 build.
export function verifyFixedUsed5RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r5', [
    'e2eb04751cc913642f2efdd9bdd1d3b0580785a838e83900e99cffb901e22f8b',
    '71c37de7ccc65ea124a545b2ed1540d59382d9a35692459bde7bde173f3c8802',
    'a736b5a3d9f7bb9130e6090209aaa53a2b7ac49bd5a1d68d4994137591a68652',
    '6afbad2eb2f5e57a1d4c41b0bf45979dec9dd6f5134fce35478b7c9f2ebc0dbc',
  ]);
}

// Only this named UX recovery build may inherit the verified r6 service pair.
export function verifyFixedUsed6RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r6', [
    'f2483f1653bf8fbbb9e38c23e086148a0c5c13f5c14a207d20f00e7eb2c4b15a',
    '458b7af66a2fffa9aaf21791f80ea3776a5cc8d2a767e047678bd7e89b9b3e3b',
    '9a2d57af61bb499db140efb458275896a204f1bfa796b57df84eff27e5f6403c',
    'f2aee15ce964ae9731869e72aa72094c924a31e7580a9921222b30db82f328b8',
  ]);
}
export function verifyFixedUsed7RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r7', [
    'a99b839f4776f0fe5f123c8ac9767a42415a9c8321e8b3fa9845ec447e40c3ae',
    'a11d8b448d9772c07d3b19b098d592ec20969877890572bdad2a3b04dbc35915',
    'b621aaa271aaac2354c55155f6677988afcdf1fa11442af6e2cc7226289efe68',
    'feb295a8105580f9e6f53d782ff05941286e401be7b04b821a316f4ebe62efff',
  ]);
}
export function verifyFixedUsed8RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r8', [
    '197f99a94b3250921c9289f7fbe9c4f4a92595211f7efd9c71dc9052cfdbad26',
    'eb12d704396c042928259ef41e303b8e7e32cc0b3b0599450e5ab524f7871098',
    '908d3f16ad722a9eebe59980612ef8fbcbb74ec674e7c048135fc8565a1309d1',
    '97248f1e90b574b950b00674524c3081660cd733c3c7ee3c571550068b3a1bcd',
  ]);
}
export function verifyFixedUsed9RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r9', [
    'a338ef2fe6958040cf9c524b43e11a9c69cbd85d9c4aa7316a9b6132dad4242e',
    '8df9135f2105638e46d7c07653d05d1c95098b03ba0b201bddad1eb2e2c10ea1',
    'ec2a3d2831bb8b0e776b6aa3913585191d51bdc677bf60a24f7fab42e12de324',
    '740011cb175b6430e5e228c0935a29bff32bba97e77bb31f4b58663d70e95a0f',
  ]);
}
export function verifyFixedUsed10RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r10', [
    '0aed74f689ad4bea8c132fc03a2594703bfdbd0cf94f94817cf28c677be64e46',
    '809df2572041365bc5da294f08b8efa9ead029d43e6aed0331556254cea1c7b7',
    '3c9ed8c8f3d744966cc495b3092efc2d78e849d33ae7b0922ba85b05cccbd7ab',
    'fd82d2ecc93a409a6b7303a41d741dc4f60e3be52e3ce12f836bc9128250391e',
  ]);
}
export function verifyFixedUsed11RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r11', [
    '79e4feb4a8dade95ee3004a1585e62e898f7fba78a16a6124ce31e44ffbe1209',
    '10392fc6a55685c1e26d3550197628cbdea0ed405677fcd8d63db4e38f1bd4d0',
    'b1520d4c2afdf38b9bc0a624939754fe84dac1f9886ef7ffcc2ab768e016d5e7',
    '605c47eeb7bd3defc73a0c67181b1962f2ab3e29021fc28467944553d3389faf',
  ]);
}
export function verifyFixedUsed12RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r12', [
    '242c3bfadf632ee23d51db6f2659cf6e7c5f9160b47e6756b62e11ae3d196dc5',
    '9b591c77cb7fbd6d6f986582ef55468c0dc76eb020e82fd55e87e60383d4310d',
    '91cf8171167a978278210d9913131f0e883a694cafe4207f118cdb3222833f28',
    'a3dedcdf0cfcbbe15e442a0f3270df8e94675acf32172074137e8b63e9fb14c9',
  ]);
}
export function verifyFixedUsed13RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r13', [
    '04cd5ee48309681894d878c911f4c3228f6a5b8efa1f49bb30d1ce06d4404fc1',
    '7281990f3d4f62e8bd7fb952d18796c3a26c1a42148d7fa947541f5af889ca0a',
    'b5d8022738aed9780ef7362ba529ed443bf6612970f90032b177beeda728b58a',
    '065cf639b7c4cf90454aec540c60b952531959ac838d183ae1c29221023d08e1',
  ]);
}
export function verifyFixedUsed15RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r15', [
    '6536a302f8de457fca2f179995ced0f0ffb65dc2515b4199f91c29d3e442efb4',
    '1302650934e15723d7cec5de26c7524508e724878025997b70ad4a9842a71179',
    'f1bea01d5dd7ff321602c444fec351addc12c91b8c30cea63817aba2839f36dd',
    'b093bf380de84a7682dbd88f262334ce3583318a563a8f2bd42c41c3d536c079',
  ]);
}
export function verifyFixedUsed16RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r16', [
    '5a09cd2c9761fcc83c9c0e047aecdd5a8ad02dad26ffab8c4a07d56c130a73ed',
    'd75dd7abe77a7dd8346c1c352e75a97e7a4876e2016328c11c5645b5139ea902',
    '1dac30b6623af94cd7eb1f5dc4ce98cc4200e37b0905fee9e0ca9be60ee39183',
    '4fb00aa754b7ccea762b10bae73bae4cef0cf0edd7ff7144599dfa4b8c258a05',
  ]);
}
export function verifyFixedUsed17RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r17', [
    '7b7c2efee495c4b1d874ec142d39f9c4a351ef3e7f6078ea369a8ed7b7dd0447',
    '84096449a1eb73fa2fd6ae416caf717cacb336aadc882d89f8d09b787709716a',
    'f477de81b2e5817e9fb095ad2f97cefffcdf9841578587adb20792333c1187ea',
    'f7e311d72119c27a08ca6142406d03c9572e08f2329012030cbaeef0190c8e58',
  ]);
}
export function verifyFixedUsed18RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r18', [
    'ca1c0419d88e1133bce7359b8588c6c4eef5a46e486f035c02cc774b46a62487',
    '77a17d551d0e190c50ec95dd101dc01b5dffcc31f7090d56ac8cb414ba8c786b',
    '2a97adce808195dff462e0b6580078a1eedbdf3d7e4eae983c970a2da279cac4',
    '97955b14dad5578575bb73082e9429cecf7a8dbdfccd7eb37deb29a9fe5de178',
  ]);
}
export function verifyFixedUsed19RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r19', [
    'd0bc86cd4f7decf5291a0670bd7bf97fa9afc19025b3444cc2d1ec98315efede',
    '5b6db04ff29449304acd20a1b349e32a45182daa702fa81815565f5d21c89f51',
    '51d2b817561d916489ce96ab2fc64704da006757c424e34e37f0410033305537',
    'dc01a3b32b8dc9ee2908ae8427e004a95351a03fe7e31754411bca18c408d63d',
  ]);
}
export function verifyFixedUsed20RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r20', [
    '6eb77641f665fa007444c01980f3e003dd1478de3b198ae43ba5fe58c1a2f865',
    'fdacbbcc6daaf05e5296a521f90db257e341c144579e1a874a0c58f5e86095de',
    '3a2ca6eb2c3e2d84efa6a19c6d20946e2cf4825af1785f0417eda1dee8eab972',
    '228e7f6d33e49d586d881ab1e65b0cb7a510409c6001b356094bc6cad1c48d36',
  ]);
}
// Only the exact r22 build may inherit the verified r21 pair.
export function verifyFixedUsed21RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r21', [
    'df6be33a0f4b2951527655d2982a9d30993907bce3f7c130580eaf607eda9a8c',
    '94e323ac56994ad3a8f9fe6732a418aa96c71e7a8055e1ca5b38999fe405d41f',
    'b715628c1b20571e909904bac9a7894d2da6787b0be9802274bc6a9b2c9f305e',
    'b4ef553707d5ab400dc1adc227d0d515f7901929a99ef498906bf83b89339adf',
  ]);
}
// Only the exact r23 build may inherit the verified r22 pair.
export function verifyFixedUsed22RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r22', [
    '5c2a8b1da206fdcc00e6e9d5731e9b53edd647bdea867f96128bf69c45db8a1c',
    '2e24a0b37c344cddf829c59ba9fa9dc6417af6aaa94b43185566ae436fd24149',
    '1dfe3bed95d2154d9c15981f6bfb8a34d33374953e5a80f2ddc3c142cb36f437',
    '1d3e26a2548b3f527fcec0bd3b9aa5220b53c896ac16f5c35f0e054799e02b67',
  ]);
}
// Only the exact r24 build may inherit the verified r23 pair.
export function verifyFixedUsed23RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r23', [
    '2118acab70542131a9ee7258ef1cfcd118b94504073501afac069206cf55da41',
    '29ec381044d5f1c93fc22cf99ab9354100883b1e6e103efbd33e908588660643',
    '55a05bea3779f8dfb6053e8ffe97c9bd40216dbe91d432872b98720bc781e44a',
    'd68aac074abf3aeae15da4afb22d4f1804a710cf475064164c65ee7afee02dc6',
  ]);
}
// Only the exact r25 build may inherit the verified r24 pair.
export function verifyFixedUsed24RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r24', [
    'a98d926657a8ffb6d8e52a49b7ed4022406474ad427567b60a6083e3fa6fe29e',
    'f80fc116d9e0335a7388e47a05276953c61a9c9107a13c9a7075e8a114d9ccae',
    '9e521bc394d99268732dcde18f5cf88b9a250da4b5e5976d67752b32a0c9c95b',
    '25d35d35f552460606a910b9d874c5d493102020c4b663e682a8cf75f4b2c62d',
  ]);
}
// Only the exact r26 build may inherit the verified r25 pair.
export function verifyFixedUsed25RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r25', [
    'ef5329cc151943ae5b546dc5ea183347f713e85c01a89d09824e77b3dcccca96',
    '9ba885d1d2165e4343a436e95fa0a041e06d0aa3356f33e0f8d13def020d8bb9',
    '6d14097c774135b80a5dbb2289b44820b45e7880b9939d9450f7cd1492275c76',
    'c89d2f05109a3c1ee14d135418bbc170f72c782add3b40215ca58a6a26cfa96d',
  ]);
}
// Only the exact r27 build may inherit the verified r26 pair.
export function verifyFixedUsed26RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r26', [
    '732a45cf2fb4a7ced2a972f64da918e6e5248e1d1d4845c2f5e07e073bcabbe6',
    '6f545b7e9ee11d8d9817f2051955a9e8fc3b70cc680046efe7aaadfb19fde900',
    '7d11feccd301c310bad78f980e7a5e39fcb45f0d9b12a68f53c0fb031ba6657e',
    'b0b1b41f89dd77d741889df9651f4e795f34d071a480b2fa75a635ebe0be116f',
  ]);
}
// Only the exact r28 build may inherit the verified r27 pair.
export function verifyFixedUsed27RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r27', [
    '66c72efdfe2481fe3bed5f73270ca3303a93bbffa3b56bb5cdb7c0fc58be8265',
    '34601ae693775302d7a14ead42e2953b492cf604bf2bc3dba351257461e3eecf',
    '333f91d1b6fe15f5b55e2c3f7c2a9daa984c35632c27cf187f6b920dbe3cec9d',
    '6338489bb198cda6d44d42f3b93207f0f736a582afb385501fe0ba659742673f',
  ]);
}
// Budget renewal is bound to the currently observed r28 container pair.
export function verifyFixedUsed28RunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes) {
  return verifyFixedRecoveryRunArtifacts(root, configBytes, composeBytes, buildBytes, identityBytes, 'r28', [
    '26e33bbd0aa5df0b364104dca0d258ccc06e8f603fa2e6b23d0e73dc965213e3',
    'dbbd4f9bef49d5fcf657eadffb0971ecc65d2d023db149600803dde3ff234b7b',
    'e827ed297afef5047086cbefed940eaca42ec44dc60620fa9470af8888140b14',
    '4ddf668a62f5a5637659b07294e88b526f9b8532fc350cf9b7f1b9d6e33436f1',
  ]);
}
export function used2ResumeSource(buildId) { return buildId === '20261109-budget-r29' ? 'r28' : buildId === '20261109-seek-audio-r28' ? 'r27' : buildId === '20261109-manual-track-r27' ? 'r26' : buildId === '20261109-independent-track-r26' ? 'r25' : buildId === '20261109-source-track-r25' ? 'r24' : buildId === '20261109-audio-message-r24' ? 'r23' : buildId === '20261109-grant-r23' ? 'r22' : buildId === '20261109-reauth-r22' ? 'r21' : buildId === '20261109-qc-r21' ? 'r20' : buildId === '20261108-errors-r20' ? 'r19' : buildId === '20261108-audio-r19' ? 'r18' : buildId === '20261108-workspace-r18' ? 'r17' : buildId === '20261108-status-r17' ? 'r16' : buildId === '20261108-audio-r16' ? 'r15' : buildId === '20261108-qc-r15' || buildId === '20261108-noop-r14' ? 'r13' : buildId === '20261108-profile-r13' ? 'r12' : buildId === '20261108-audio-r12' ? 'r11' : buildId === '20261108-plan-r11' ? 'r10' : buildId === '20261106-ux-r10' ? 'r9' : buildId === '20261106-ux-r9' ? 'r8' : buildId === '20261106-ux-r8' ? 'r7' : buildId === '20261106-ux-r7' ? 'r6' : buildId === '20261105-r6' ? 'r5' : buildId === '20261105-r5' ? 'r4' : buildId === '20261105-r4' ? 'r3' : 'r2'; }
