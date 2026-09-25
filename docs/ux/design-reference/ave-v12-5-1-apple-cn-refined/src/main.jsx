
import React, {useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {AnimatePresence, motion} from "framer-motion";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);

const stories = [
  {
    kicker: "故事 01",
    title: "朋友之间",
    desc: "把真正值得留下的互动放在中心，让一次旅行变成一段关于关系的记忆。",
    chips: ["人物反应", "真实对白", "情绪转折"]
  },
  {
    kicker: "故事 02",
    title: "意外之旅",
    desc: "从迷路、迟到和临时改变中找到节奏，让意外成为整段旅程最有趣的部分。",
    chips: ["意外事件", "轻松节奏", "反差"]
  },
  {
    kicker: "故事 03",
    title: "城市一日",
    desc: "用地点和时间推进叙事，把散落的街景、美食和夜晚重新组织成完整的一天。",
    chips: ["地点", "时间线", "氛围"]
  }
];

const timelineBefore = [
  {left: 1, width: 12, kind: "video"},
  {left: 16, width: 9, kind: "video"},
  {left: 28, width: 18, kind: "video"},
  {left: 49, width: 10, kind: "video"},
  {left: 62, width: 24, kind: "video"}
];

const timelineAfter = [
  {left: 2, width: 15, kind: "video"},
  {left: 18, width: 11, kind: "video"},
  {left: 30, width: 14, kind: "accent"},
  {left: 45, width: 10, kind: "video"},
  {left: 56, width: 17, kind: "video"},
  {left: 74, width: 22, kind: "video"}
];

function IconMark(){
  return <span className="brandMark" aria-hidden="true">
    <i></i><i></i><i></i>
  </span>;
}

function Nav(){
  return (
    <nav className="nav">
      <a className="brand" href="#top"><IconMark/>AVE</a>
      <div className="navLinks">
        <a href="#understand">理解素材</a>
        <a href="#create">创作协作</a>
        <a href="#workspace">工作空间</a>
        <a href="#vision">愿景</a>
      </div>
      <a className="navAction" href="#workspace">看看 AVE</a>
    </nav>
  );
}

function SectionTitle({eyebrow, title, body, light=false}){
  return (
    <div className={"sectionTitle " + (light ? "light" : "")}>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

function Hero(){
  const chips = [
    ["人物", "3"],
    ["关键瞬间", "12"],
    ["地点", "6"],
    ["情绪转折", "4"]
  ];
  return (
    <section id="top" className="hero">
      <div className="heroGlow"></div>
      <motion.div className="heroCopy"
        initial={{opacity:0, y:28}}
        animate={{opacity:1, y:0}}
        transition={{duration:1.0, ease:[.22,1,.36,1]}}>
        <div className="productName"><IconMark/>AVE</div>
        <h1>让每一段素材，<br/>成为一个故事。</h1>
        <p>不再从时间线开始。先让 AVE 理解你的素材、你的意图，以及真正值得讲的那一段。</p>
        <div className="heroActions">
          <a className="primaryButton" href="#understand">看看它如何理解</a>
          <a className="textLink" href="#workspace">进入产品体验 <span>›</span></a>
        </div>
      </motion.div>

      <div className="heroStage">
        <div className="memoryOrbit orbitA"></div>
        <div className="memoryOrbit orbitB"></div>
        <div className="storyOrb">
          <div className="orbCore"></div>
          <div className="orbLabel"><span>AVE</span><b>正在理解这段旅程</b></div>
        </div>
        {chips.map(([name,num],i)=>
          <motion.div key={name} className={"floatChip chip"+i}
            initial={{opacity:0, scale:.85}}
            animate={{opacity:1, scale:1}}
            transition={{delay:.65+i*.12, duration:.7}}>
            <span>{name}</span><b>{num}</b>
          </motion.div>
        )}
        <div className="heroStats">
          <div><b>124</b><span>段素材</span></div>
          <div className="statArrow">→</div>
          <div><b>12</b><span>个关键瞬间</span></div>
          <div className="statArrow">→</div>
          <div><b>1</b><span>个完整故事</span></div>
        </div>
      </div>
    </section>
  );
}

function Understanding(){
  const refs = useRef([]);
  return (
    <section id="understand" className="understand sectionBlack">
      <SectionTitle
        eyebrow="先理解，再创作"
        title={<>不是分析文件。<br/>是理解一段经历。</>}
        body="AVE 会把散落的画面、声音与对白重新组织成人物、事件和情绪关系。你看到的不是标签，而是故事的结构。"
      />
      <div className="understandGrid">
        <div className="mediaCloud">
          {["机场","朋友","迟到","拉面","夜景","笑声","雨","迷路","车站","对话","街头","告别"].map((x,i)=>
            <motion.div className={"mediaTile mediaTile"+(i%5)} key={x}
              initial={{opacity:0,y:28,scale:.94}}
              whileInView={{opacity:1,y:0,scale:1}}
              viewport={{once:true,amount:.5}}
              transition={{delay:(i%6)*.06,duration:.5}}>
              <div className="tileImage"><span>{String(i+1).padStart(2,"0")}</span></div>
              <b>{x}</b>
            </motion.div>
          )}
        </div>
        <div className="understandPanel">
          <div className="understandPanelTop">
            <span>故事理解</span>
            <em>完成</em>
          </div>
          <div className="storyMap">
            <svg viewBox="0 0 560 390" aria-hidden="true">
              <path d="M95 82 C190 60 215 120 278 153" />
              <path d="M108 280 C190 250 200 205 278 153" />
              <path d="M278 153 C355 140 385 90 466 82" />
              <path d="M278 153 C350 190 390 265 468 300" />
              <path d="M278 153 C300 240 300 290 298 337" />
            </svg>
            <div className="mapNode nodePerson"><small>人物</small><b>朋友</b></div>
            <div className="mapNode nodeEvent"><small>事件</small><b>错过预约</b></div>
            <div className="mapNode nodeMoment"><small>瞬间</small><b>忍不住笑</b></div>
            <div className="mapNode nodeEmotion"><small>情绪</small><b>紧张 → 释然</b></div>
            <div className="mapNode nodeEnding"><small>关系</small><b>一起解决</b></div>
            <div className="mapNode nodeStory"><small>故事价值</small><b>友情</b></div>
          </div>
          <div className="insightLine">
            <span className="pulseDot"></span>
            <p>“真正有意思的不是你们迟到了，而是大家从紧张到一起笑出来的那一刻。”</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryDiscovery(){
  const [active,setActive] = useState(0);
  return (
    <section className="storyDiscovery">
      <div className="whiteWrap">
        <SectionTitle
          light
          eyebrow="一个素材库，不止一种讲法"
          title={<>AVE 找到的不是模板。<br/>是三个不同的故事方向。</>}
          body="先选你真正想讲的故事。节奏、镜头和音乐，之后才有意义。"
        />
        <div className="storyTabs">
          {stories.map((s,i)=>
            <button key={s.title} className={i===active?"active":""} onClick={()=>setActive(i)}>
              {s.title}
            </button>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={active} className="storyHeroCard"
            initial={{opacity:0,y:20}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0,y:-12}}
            transition={{duration:.45}}>
            <div className={`storyCardVisual visual${active}`}>
              <div className="filmStrip">
                <i></i><i></i><i></i><i></i>
              </div>
              <div className="storyArc">
                <span>开始</span>
                <svg viewBox="0 0 600 120"><path d="M0 86 C100 88 145 36 236 60 C330 92 376 20 455 42 C510 58 548 28 600 16"/></svg>
                <span>结束</span>
              </div>
            </div>
            <div className="storyCardCopy">
              <div className="eyebrow dark">{stories[active].kicker}</div>
              <h3>{stories[active].title}</h3>
              <p>{stories[active].desc}</p>
              <div className="chipRow">{stories[active].chips.map(x=><span key={x}>{x}</span>)}</div>
              <button className="primaryButton darkButton">选择这个方向</button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function Collaboration(){
  const [applied,setApplied]=useState(false);
  return (
    <section id="create" className="collaboration sectionBlack">
      <SectionTitle
        eyebrow="真正的创作协作"
        title={<>你说感受。<br/>AVE 理解要改什么。</>}
        body="不需要描述剪辑命令。像和真正的剪辑师沟通一样，说出你觉得哪里不对。"
      />
      <div className="conversationStage">
        <motion.div className="humanMessage" initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}}>
          中间有点平，我想让朋友之间的感觉更明显一点。
        </motion.div>
        <motion.div className="directorCard" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}}
          transition={{delay:.18}}>
          <div className="directorHead">
            <div className="directorAvatar"><IconMark/></div>
            <div><b>AVE</b><span>创作建议</span></div>
          </div>
          <h3>我找到问题了。</h3>
          <p>抵达之后很快进入街景，人物反应被跳过去了，所以情绪没有真正落下来。</p>
          <div className="suggestions">
            <div><i>01</i><span><b>保留朋友的反应</b><small>让转折有一个真实的情绪落点</small></span></div>
            <div><i>02</i><span><b>压短街景蒙太奇</b><small>把时间还给人物，而不是继续展示地点</small></span></div>
            <div><i>03</i><span><b>把一段对白提前</b><small>更早建立你们之间的关系</small></span></div>
          </div>
          <div className="directorActions">
            <button className="secondaryButton">先看看变化</button>
            <button className="primaryButton" onClick={()=>setApplied(true)}>
              {applied ? "已应用到新版本" : "应用这个修改"}
            </button>
          </div>
          <AnimatePresence>
            {applied && <motion.div className="safeNotice"
              initial={{opacity:0,height:0}}
              animate={{opacity:1,height:"auto"}}>
              <span>✓</span>
              已保留你确认过的对白、人物隐私与结尾内容。
            </motion.div>}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function Timeline({after=false}){
  const clips = after ? timelineAfter : timelineBefore;
  return (
    <div className="timelineUI">
      <div className="timelineHeader">
        <span>{after ? "新版本" : "当前版本"}</span>
        <div className="timelineTools"><i></i><i></i><i></i></div>
      </div>
      <div className="trackRow storyTrack">
        <label>故事</label>
        <div className="trackBody">
          <span className="beat beat1">开场</span>
          <span className="beat beat2">意外</span>
          <span className="beat beat3">转折</span>
          <span className="beat beat4">收束</span>
        </div>
      </div>
      <div className="trackRow">
        <label>画面</label>
        <div className="trackBody clipBody">
          {clips.map((c,i)=><span key={i} className={"clip "+c.kind} style={{left:c.left+"%",width:c.width+"%"}}>
            <em>{i+1}</em>
          </span>)}
        </div>
      </div>
      <div className="trackRow">
        <label>声音</label>
        <div className="trackBody waveform">
          {Array.from({length:56}).map((_,i)=><i key={i} style={{height:(7+Math.abs(Math.sin(i*.65))*22)+"px"}}></i>)}
        </div>
      </div>
      <div className="trackRow">
        <label>字幕</label>
        <div className="trackBody captionTrack">
          <span>“我就知道会这样。”</span>
          <span>“算了，走吧。”</span>
        </div>
      </div>
      <div className="playhead"></div>
    </div>
  );
}

function Workspace(){
  const [mode,setMode]=useState("after");
  return (
    <section id="workspace" className="workspaceSection sectionBlack">
      <SectionTitle
        eyebrow="AVE 工作空间"
        title={<>故事在上面。<br/>工具退到后面。</>}
        body="你可以看素材、看成片、看故事结构，也可以直接和 AVE 讨论。时间线仍然存在，但不再要求你先成为剪辑师。"
      />
      <div className="productShell">
        <div className="productTopbar">
          <div className="traffic"><i></i><i></i><i></i></div>
          <div className="projectTitle">东京 · 朋友之间</div>
          <div className="versionPill">{mode==="after" ? "新版本" : "当前版本"}</div>
        </div>
        <div className="productBody">
          <aside className="storySidebar">
            <div className="sideTitle">故事</div>
            <button className="active"><span>◉</span> 人物关系</button>
            <button><span>◇</span> 关键瞬间</button>
            <button><span>○</span> 情绪曲线</button>
            <button><span>⌁</span> 地点与事件</button>
            <div className="sideDivider"></div>
            <div className="sideInsight">
              <span>当前重点</span>
              <b>朋友之间的反应和默契</b>
            </div>
          </aside>
          <div className="previewArea">
            <div className="previewFrame">
              <div className="mockScene">
                <div className="sceneSky"></div>
                <div className="sceneCity"></div>
                <div className="personSilhouette p1"></div>
                <div className="personSilhouette p2"></div>
              </div>
              <div className="previewCaption">{mode==="after" ? "“我就知道会这样。”" : "下一站，浅草。"}</div>
              <button className="playButton">▶</button>
              <div className="previewMeta">02:31 / 05:12</div>
            </div>
            <div className="previewBelow">
              <div><b>{mode==="after" ? "朋友反应" : "街景段落"}</b><span>{mode==="after" ? "情绪转折" : "过渡"}</span></div>
              <button onClick={()=>setMode(mode==="after"?"before":"after")}>对比前后</button>
            </div>
          </div>
          <aside className="directorSidebar">
            <div className="directorMiniHead"><IconMark/><b>AVE</b><span>创作伙伴</span></div>
            <div className="directorBubble">我把人物反应提前了 8 秒，同时缩短了街景。现在转折会更完整。</div>
            <div className="changeSummary">
              <span>这次变化</span>
              <div><b>+1</b><small>人物反应</small></div>
              <div><b>−12s</b><small>重复街景</small></div>
              <div><b>✓</b><small>对白保持</small></div>
            </div>
            <button className="primaryButton wide">继续调整</button>
          </aside>
        </div>
        <div className="timelineWrap">
          <Timeline after={mode==="after"}/>
        </div>
      </div>
    </section>
  );
}

function BeforeAfter(){
  const [after,setAfter] = useState(true);
  return (
    <section className="beforeAfter">
      <div className="whiteWrap">
        <SectionTitle
          light
          eyebrow="差别不只是剪短"
          title={<>从一堆片段，<br/>到一个有意图的故事。</>}
          body="AVE 的价值不是把 37 分钟压成 5 分钟，而是知道什么值得留下，以及为什么。"
        />
        <div className="compareSwitcher">
          <button className={!after?"active":""} onClick={()=>setAfter(false)}>原始素材</button>
          <button className={after?"active":""} onClick={()=>setAfter(true)}>AVE 故事</button>
        </div>
        <div className={"compareStage " + (after?"after":"before")}>
          <div className="compareVisual">
            {after ?
              <div className="finalFilm">
                <div className="filmImage"></div>
                <div className="filmTitle">朋友之间</div>
                <div className="filmMeta">5:12 · 有完整起伏 · 人物驱动</div>
              </div>
            :
              <div className="rawWall">
                {Array.from({length:18}).map((_,i)=><i key={i}><span>{String(i+1).padStart(2,"0")}</span></i>)}
              </div>
            }
          </div>
          <div className="compareStats">
            <div><b>{after ? "12" : "124"}</b><span>{after ? "关键瞬间" : "原始片段"}</span></div>
            <div><b>{after ? "1" : "37:42"}</b><span>{after ? "完整故事" : "素材时长"}</span></div>
            <div><b>{after ? "5:12" : "—"}</b><span>{after ? "成片时长" : "叙事结构"}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyAVE(){
  const items = [
    ["01","理解故事","先理解人物、事件和情绪，再做剪辑决定。"],
    ["02","与你协作","你给感受和方向，AVE 把它转化成具体创作方案。"],
    ["03","解释改变","每一次建议都告诉你改变了什么，而不是只给一个黑盒结果。"],
    ["04","始终可控","重要内容、隐私与已确认选择不会因为一句反馈被意外覆盖。"]
  ];
  return (
    <section className="whyAve sectionBlack">
      <SectionTitle
        eyebrow="为什么是 AVE"
        title={<>不是更快的剪辑软件。<br/>是另一种创作方式。</>}
      />
      <div className="whyGrid">
        {items.map(([n,t,d])=>
          <div className="whyCard" key={n}>
            <span>{n}</span><h3>{t}</h3><p>{d}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function WhyNow(){
  return (
    <section className="whyNow">
      <div className="whiteWrap">
        <SectionTitle
          light
          eyebrow="为什么是现在"
          title={<>人人都在记录。<br/>但真正完成的故事仍然很少。</>}
          body="拍摄已经足够简单，剪辑工具也足够丰富。下一步缺少的，是一个真正理解素材和创作意图的协作者。"
        />
        <div className="nowStatement">
          <div><b>更多素材</b><span>手机、运动相机、无人机让每个人拥有前所未有的影像量。</span></div>
          <div><b>更强理解</b><span>多模态模型第一次能够同时理解画面、语言、事件与上下文。</span></div>
          <div><b>新的入口</b><span>创作可以从“操作工具”转向“表达意图并共同完成”。</span></div>
        </div>
      </div>
    </section>
  );
}

function Vision(){
  return (
    <section id="vision" className="vision sectionBlack">
      <div className="visionGlow"></div>
      <div className="visionInner">
        <div className="productName"><IconMark/>AVE</div>
        <h2>未来的视频创作，<br/>不该从学习剪辑开始。</h2>
        <p>它应该从一句“我想讲这个故事”开始。</p>
        <a className="primaryButton" href="#top">重新体验</a>
      </div>
      <footer>
        <div><IconMark/>AVE</div>
        <span>AI Vlog Co‑Editor · Product Vision Demo</span>
      </footer>
    </section>
  );
}

function App(){
  const root = useRef(null);
  useEffect(()=>{
    const ctx = gsap.context(()=>{
      gsap.utils.toArray(".sectionTitle").forEach(el=>{
        gsap.from(el.children,{
          scrollTrigger:{trigger:el,start:"top 78%"},
          opacity:0,
          y:34,
          duration:.9,
          stagger:.08,
          ease:"power3.out"
        });
      });
      gsap.to(".storyOrb",{
        scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:1},
        scale:.78,
        y:120,
        opacity:.1
      });
      gsap.to(".memoryOrbit",{
        scrollTrigger:{trigger:".hero",start:"top top",end:"bottom top",scrub:1},
        rotate:140,
        scale:1.2
      });
      gsap.from(".productShell",{
        scrollTrigger:{trigger:".productShell",start:"top 78%"},
        opacity:0,
        y:80,
        scale:.96,
        duration:1.1,
        ease:"power3.out"
      });
    },root);
    return ()=>ctx.revert();
  },[]);

  return (
    <div ref={root}>
      <Nav/>
      <Hero/>
      <Understanding/>
      <StoryDiscovery/>
      <Collaboration/>
      <Workspace/>
      <BeforeAfter/>
      <WhyAVE/>
      <WhyNow/>
      <Vision/>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
