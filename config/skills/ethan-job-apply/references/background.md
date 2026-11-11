# Yunchen Yuan — Background for Job Applications

Compiled: November 11, 2026. Availability and graduation updated from the user’s confirmation on November 11, 2026. This is a private application reference, not a public résumé.

## Sources

- Résumé: `/Users/yuanyunchen/Documents/简历/Yunchen Yuan - Resume.pdf`, read November 11, 2026.
- Existing application profile: `~/Desktop/APPLY-METHOD.md`, read November 11, 2026. These are previously recorded details, not newly reconfirmed facts.
- Application-answer preferences confirmed in this conversation on November 11, 2026.

Experience and metrics below are reported in the résumé; they have not been independently audited. Example answers are drafts based on those facts.

## Professional summary

I’m a computer science master’s student at Columbia, specializing in machine learning. My experience spans production recommendation systems, LLM agents, multimodal training data, and diffusion-based image restoration. At TikTok, I independently owned an LLM embedding pipeline from design and analysis through optimization and online experiments. I also built agents and reusable skills to automate strategy development. My project work focuses on efficient video understanding and mathematical reasoning with small language models.

## Contact and identity

| Field | Recorded detail |
|---|---|
| Name on the designated résumé | Yunchen Yuan |
| Alternate application name | Ethan Yuan for large technology companies and IBM, per existing preferences; keep application name consistent with the selected résumé |
| Email | yunchen.yuan@columbia.edu |
| Phone | +1 (646) 856-1097 |
| Location | New York, NY |
| LinkedIn | https://www.linkedin.com/in/yunchen-yuan |
| GitHub | https://github.com/yuanyunchen |

## Education

### Columbia University — New York, NY

- M.S. in Computer Science, Machine Learning Track.
- Expected graduation: December 2026; graduation month confirmed by the user on November 11, 2026. Not yet completed as of this profile.
- GPA: 3.96/4.0.
- Coursework: Machine Learning, Deep Learning, LLM, Agentic Engineering, Natural Language Processing.
- Start date in the existing application profile: August 2025.

### The Hong Kong Polytechnic University — Hong Kong

- B.S. in Computer Science, minor in Applied Mathematics.
- Graduated July 2025.
- Major GPA: 4.0.
- Honors recorded in the application profile: Dean’s List with First Honors; Undergraduate Research & Innovation Scholarship; Computer Science Department Scholarship; Study Abroad Scholarship.

## Internship and research experience

### TikTok — Machine Learning Engineer Intern

San Jose, CA · May–August 2026

- Used website activity (Pixel) and search signals to identify user intent and improve ad recall. The production strategy increased Travel & Entertainment ad revenue by 10.83%, reported as $2M+ annualized.
- Independently owned an LLM embedding pipeline to match and rank relevant products, covering design, data analysis, optimization, and online experiments. Reported revenue increase: 10.01%.
- Built AI agents and reusable skills to automate strategy development, from data analysis and strategy design through offline optimization. Reported development efficiency improvement: 3x+.
- Strong examples for questions about ownership, production impact, recommendation systems, and agent automation. These are separate results; do not add the revenue percentages together.

### InfiX.ai — Machine Learning Engineer Intern

Shenzhen, China · March–May 2025

- Designed a multimodal captioning pipeline using an ensemble of LLMs to generate high-quality image descriptions.
- Designed a visual training data pipeline producing 200K+ samples for supervised fine-tuning initialization before reinforcement learning.
- Evaluated multimodal LLMs on visual reasoning and hallucinations.

### Shanghai AI Lab — Research Intern

Shanghai, China · November 2023–March 2024

- Developed diffusion-based image restoration, improving SSIM from 0.74 to 0.84 and MANIQA from 0.53 to 0.72. The résumé describes the results as state of the art.
- Built a GAN-based image restoration model for comparison and used human pose analysis to clean training data.
- Co-authored work associated with arXiv:2404.03642 and arXiv:2412.09324.

### Tsinghua University & Pennsylvania State University — Research Intern

Remote · April–December 2024

- Analyzed failure modes in conditional diffusion models for image restoration, including distortion and semantic deviation.
- Designed a region-aware diffusion model to detect and restore blurred regions in a single process.

### China Unicom Limited — Software Engineer Intern

Shanghai, China · June–July 2024

- Built Java and SQL backend services for a medical insurance platform deployed across Shanghai’s public hospitals.
- Contributed to requirements analysis, API development, testing, and deployment to improve system reliability.

## Projects

### Temporal-Spatial Video Understanding Agent

March–December 2025

- Developed an LLM-driven architecture with specialized agents for temporal-spatial video analysis.
- Added hierarchical memory and adaptive frame retrieval to reason over hours of video without full preprocessing.
- Achieved 70.8% accuracy on EgoSchema using an average of 22.5 frames per video.
- Main highlight: selective retrieval and memory for efficient long-video reasoning.

### SLM-Math: Small Language Models for Mathematical Reasoning

October–December 2025

- Built a multi-agent system that solves and checks math problems, with Python used for calculations.
- Trained agents on step-by-step solutions using supervised fine-tuning and reinforcement learning.
- Used Qwen2.5-Math-1.5B, a 1.5-billion-parameter model, achieving 86.8% accuracy on GSM8K and 68.8% on MATH-500.
- Main highlight: combining agent collaboration, tool use, and training to improve a small model’s reasoning.
- The résumé compares performance with larger models such as GPT-4o; no matched evaluation protocol or baseline scores are supplied here, so avoid making a broader equivalence claim.

## Publications

- DiffBody: https://arxiv.org/html/2404.03642v1 — the existing application profile identifies Yunchen as the fourth of eight authors. Describe the work as a collaboration, not sole authorship.
- Additional co-authored paper: https://arxiv.org/abs/2412.09324.
- The résumé describes these as papers in top AI journals. Exact titles, venues, publication status, and individual contributions beyond the listed research work have not been verified in this profile.

## Technical skills

| Area | Skills listed in the résumé |
|---|---|
| Deep learning and LLMs | Transformer, Diffusion, LoRA, SFT, GRPO, RLHF, RAG, Harness Engineering |
| Frameworks and libraries | PyTorch, LangGraph, LangChain, vLLM, Transformers, scikit-learn, OpenCV, NumPy |
| Tools and infrastructure | Python, Spark, Docker, Linux, Git, Dify, GCP, Kubernetes, W&B, Hugging Face |
| Mathematics | Probability and Statistics, Linear Algebra, Optimization, Discrete Mathematics, Modeling |
| Additional experience | Java and SQL backend development at China Unicom |

Do not infer that every listed tool was used on every project.

## Short answer examples

### Describe a project you built

I built a multi-agent system for understanding long videos. It uses hierarchical memory and adaptive frame retrieval to select useful frames instead of preprocessing the entire video. The system achieved 70.8% accuracy on EgoSchema while using only 22.5 frames per video on average. The key contribution was combining memory with selective retrieval to make long-video reasoning more efficient.

### Describe something you owned end to end

At TikTok, I independently owned an LLM embedding pipeline for matching and ranking relevant products. I took it from design and data analysis through optimization and online experiments, and it increased revenue by 10.01%. The project gave me experience connecting model development to a measurable product outcome.

### Describe your experience building agents

At TikTok, I built AI agents and reusable skills to automate strategy development, including data analysis, strategy design, and offline optimization. This improved development efficiency by more than 3x. I’ve also built agents for long-video understanding and a multi-agent math system that solves and checks problems with Python.

### Describe your experience with model training and evaluation

For SLM-Math, I built a multi-agent system that solves and checks math problems, then trained the agents with supervised fine-tuning and reinforcement learning. Using Qwen2.5-Math-1.5B, the system achieved 86.8% on GSM8K and 68.8% on MATH-500. At InfiX.ai, I also worked on multimodal training data and evaluated models for visual reasoning and hallucinations.

## Existing application details and preferences

These come from the existing application profile. Recheck time-sensitive facts when the question requires current status.

| Question | Recorded answer |
|---|---|
| Authorized to work in the United States? | Yes |
| Need sponsorship now or in the future? | Yes |
| Can work without sponsorship now and in the future? | No |
| Nationality | Chinese |
| U.S. citizenship or green card | Neither |
| Existing security clearance | None; willing to apply |
| Desired compensation | $200,000 by default; use the upper end of a stated salary range under existing preferences |
| Earliest start date | February 22, 2027 (2027-02-22). User confirmed February 22 on November 11, 2026; year follows the established application timeline. Do not state availability before this date |
| Work arrangements | Open to on-site, hybrid, and relocation |
| Location preference | Seattle for Seattle-headquartered companies; otherwise Bay Area, then New York |
| Experience duration | Existing profile says one year including internships; use the actual dated roles and the question’s definition rather than treating this as one year of full-time employment |
| Criminal record | None recorded |
| Driver’s license | None recorded |
| Noncompete or conflict of interest | None known in the existing profile |
| Background check, drug testing, work-related texts | Willing, per existing preferences |

### Optional demographic responses

For relevant voluntary application fields only; these do not belong in project answers or professional summaries.

- Male; he/him; Asian; not Hispanic or Latino.
- Not a veteran; no disability recorded.
- Decline to answer sexual orientation, transgender status, age range, and community-affiliation questions.

## Answering preferences and information gaps

- Use the most relevant real experience and write naturally in the first person. Keep answers concise and highlight the contribution, approach, and supported result.
- Reason through unfamiliar questions using the background above; a missing template is not a reason to stop.
- Do not invent team size, leadership responsibilities, deployment scale, model architecture, tools used on a specific project, motivations, conflicts, failures, or numerical results.
- If a required answer depends on a missing personal fact, ask a focused question. After the user answers, record the confirmed detail with its confirmation date for reuse.
- Exact visa category and validity, detailed address, current offers, and specific failure/conflict stories are not established here.
- Do not provide SSN or date of birth. The existing application instructions require stopping if either is mandatory.
