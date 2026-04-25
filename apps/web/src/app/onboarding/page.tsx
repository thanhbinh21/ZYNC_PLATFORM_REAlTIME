'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/api';

const SKILL_TAGS = [
  'javascript', 'typescript', 'react', 'nextjs', 'vue', 'angular', 'svelte',
  'nodejs', 'express', 'nestjs', 'python', 'django', 'fastapi',
  'java', 'spring', 'go', 'rust', 'c-sharp', 'dotnet',
  'react-native', 'flutter', 'swift', 'kotlin',
  'postgresql', 'mongodb', 'redis', 'mysql',
  'docker', 'kubernetes', 'aws', 'gcp', 'azure',
  'graphql', 'rest-api', 'grpc',
  'git', 'ci-cd', 'testing', 'security',
  'ai-ml', 'data-science', 'blockchain', 'web3',
];

const INTEREST_TAGS = [
  'frontend', 'backend', 'fullstack', 'mobile', 'devops', 'cloud',
  'ai-ml', 'data', 'security', 'blockchain', 'gamedev', 'embedded',
  'open-source', 'career', 'startup', 'freelance',
];

const STEP_META = [
  {
    id: 1,
    label: 'Profile',
    title: 'Gioi thieu nhanh ve ban',
    description: 'Them role, bio va mot vai thong tin co ban de cong dong de nhan dien hon.',
  },
  {
    id: 2,
    label: 'Focus',
    title: 'Chon ky nang va moi quan tam',
    description: 'Ho so ro hon se giup de xuat channel, mentor va noi dung phu hop hon.',
  },
  {
    id: 3,
    label: 'Links',
    title: 'Lien ket social va portfolio',
    description: 'Day la lop trust layer de ban showcase cong viec va ket noi nhanh hon.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [devRole, setDevRole] = useState('developer');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  const activeStep = STEP_META[step - 1];
  const progressWidth = `${(step / STEP_META.length) * 100}%`;
  const totalLinks = [githubUrl, portfolioUrl, linkedinUrl].filter(Boolean).length;

  const handleNext = () => setStep((current) => Math.min(current + 1, STEP_META.length));
  const handlePrev = () => setStep((current) => Math.max(current - 1, 1));

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]));
  };

  const toggleInterest = (interest: string) => {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]));
  };

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);
      await apiClient.patch('/api/users/me', {
        devRole,
        bio,
        skills,
        interests,
        githubUrl: githubUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
        onboardingCompleted: true,
      });
      router.push('/home');
    } catch (error) {
      console.error('Failed to save onboarding data', error);
      alert('Co loi xay ra, vui long thu lai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="zync-page-shell min-h-screen px-4 py-8 sm:py-10">
      <div className="zync-page-container">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="zync-soft-card zync-soft-card-elevated rounded-[2rem] p-6 sm:p-8">
            <span className="zync-soft-kicker">Developer onboarding</span>
            <h1 className="font-ui-title mt-5 max-w-[14ch] text-balance text-[clamp(2.1rem,4vw,3.6rem)] leading-[1.02] text-text-primary">
              Chao mung ban den voi ZYNC
            </h1>
            <p className="font-ui-content mt-4 max-w-[46ch] text-base leading-8 text-text-secondary">
              Flow nay duoc thiet ke theo phong cach clean minimal SaaS: nen sang, card mem, accent teal va stepper ro rang de ban hoan tat onboarding nhanh hon.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="zync-soft-badge text-sm">Ho tro Gemini</span>
              <span className="zync-soft-badge text-sm">Ho tro Claude</span>
              <span className="zync-soft-badge text-sm">Ho tro OpenAI</span>
            </div>

            <div className="mt-8 rounded-[1.6rem] p-5 zync-soft-card-muted">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-accent-strong">Step progress</p>
                  <p className="font-ui-title mt-2 text-xl text-text-primary">{activeStep.title}</p>
                </div>
                <span className="zync-soft-badge zync-soft-badge-active">Buoc {step}/3</span>
              </div>

              <p className="font-ui-content mt-3 text-sm leading-7 text-text-secondary">{activeStep.description}</p>

              <div className="mt-6">
                <div className="zync-soft-progress">
                  <span className="zync-soft-progress-bar" style={{ width: progressWidth }} />
                </div>
              </div>

              <div className="mt-6 zync-soft-stepper">
                {STEP_META.map((item) => (
                  <span
                    key={item.id}
                    className={`zync-soft-step ${item.id === step ? 'zync-soft-step-active' : ''}`}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border bg-white/55 px-4 py-4">
                <p className="font-ui-title text-[1.8rem] leading-none text-accent-strong">{skills.length}</p>
                <p className="font-ui-meta mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-text-tertiary">Skills</p>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-white/55 px-4 py-4">
                <p className="font-ui-title text-[1.8rem] leading-none text-accent-strong">{interests.length}</p>
                <p className="font-ui-meta mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-text-tertiary">Interests</p>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-white/55 px-4 py-4">
                <p className="font-ui-title text-[1.8rem] leading-none text-accent-strong">{totalLinks}</p>
                <p className="font-ui-meta mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-text-tertiary">Links</p>
              </div>
            </div>
          </section>

          <section className="zync-soft-card rounded-[2rem] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-accent-strong">Setup profile</p>
                <h2 className="font-ui-title mt-2 text-[clamp(1.5rem,3vw,2.2rem)] text-text-primary">{activeStep.title}</h2>
              </div>
              <span className="zync-soft-badge">Buoc {step}</span>
            </div>

            <p className="font-ui-content mt-3 text-sm leading-7 text-text-secondary">{activeStep.description}</p>

            {step === 1 && (
              <div className="mt-8 space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                      Vai tro
                    </label>
                    <select
                      value={devRole}
                      onChange={(event) => setDevRole(event.target.value)}
                      className="zync-soft-select"
                    >
                      <option value="developer">Developer</option>
                      <option value="student">Sinh vien IT</option>
                      <option value="mentor">Mentor</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="other">Khac</option>
                    </select>
                  </div>

                  <div className="rounded-[1.4rem] p-5 zync-soft-card-muted">
                    <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-accent-strong">Quick note</p>
                    <p className="font-ui-content mt-3 text-sm leading-7 text-text-secondary">
                      Bio ngan, role ro rang va link social day du se giup profile cua ban de duoc de xuat hon trong giai doan sau.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                    Gioi thieu ban than
                  </label>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Noi ngan gon ban dang xay dung gi, quan tam dieu gi, va can tim mentor hay community nao..."
                    className="zync-soft-textarea"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-8 space-y-8">
                <div>
                  <label className="font-ui-meta mb-3 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                    Skills
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_TAGS.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                          skills.includes(skill)
                            ? 'border border-transparent bg-text-primary text-white shadow-sm'
                            : 'border border-border bg-white/75 text-text-secondary hover:border-accent hover:text-text-primary'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-ui-meta mb-3 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                    Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_TAGS.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                          interests.includes(interest)
                            ? 'border border-transparent bg-text-primary text-white shadow-sm'
                            : 'border border-border bg-white/75 text-text-secondary hover:border-accent hover:text-text-primary'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 space-y-6">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                      GitHub
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(event) => setGithubUrl(event.target.value)}
                      placeholder="https://github.com/username"
                      className="zync-soft-input"
                    />
                  </div>

                  <div>
                    <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(event) => setLinkedinUrl(event.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="zync-soft-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-ui-meta mb-2 block text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">
                    Portfolio
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(event) => setPortfolioUrl(event.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="zync-soft-input"
                  />
                </div>

                <div className="rounded-[1.4rem] p-5 zync-soft-card-muted">
                  <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-accent-strong">Profile trust layer</p>
                  <p className="font-ui-content mt-3 text-sm leading-7 text-text-secondary">
                    Ban co the bo qua buoc nay, nhung viec them link se giup nguoi khac review nhanh hơn, nhan dien kinh nghiem va tao ket noi chat luong hon.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
              {step > 1 ? (
                <button onClick={handlePrev} className="zync-soft-button-ghost px-5 py-2.5 text-sm">
                  Quay lai
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button onClick={handleNext} className="zync-soft-button px-6 py-2.5 text-sm">
                  Tiep tuc
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="zync-soft-button px-6 py-2.5 text-sm"
                >
                  {isSubmitting ? 'Dang luu...' : 'Hoan thanh'}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
