from pathlib import Path
root = Path(r'C:/Users/chand/Downloads/testing-zone')
p = root / 'app/mocks/[id]/rank/page.tsx'
s = p.read_text(encoding='utf-8')
s = s.replace('type Summary = { total: number; correct: number; wrong: number; skipped: number };\n', '')
s = s.replace('  const [summary, setSummary] = useState<Summary | null>(null);\n', '')
a = s.index('      // 1. Recover exam summary from local storage')
b = s.index('      // 2. Fetch fresh leaderboard results', a)
s = s[:a] + s[b:]
s = s.replace('me.maxMarks ?? summary?.total ?? 0', 'me.maxMarks ?? 0')
s = s.replace('localStorage.getItem("urologics-candidate-verification") || "{}"', 'localStorage.getItem("urologics-candidate-verification") || localStorage.getItem("mockUser") || "{}"')
p.write_text(s, encoding='utf-8')

p = root / 'app/mocks/[id]/page.tsx'
s = p.read_text(encoding='utf-8')
s = s.replace('import { useAuth } from "@/components/auth/AuthProvider";', 'import { useAuth } from "@/components/auth/AuthProvider";\nimport toast from "react-hot-toast";')
s = s.replace('if (!localStorage.getItem(`mock-${id}-first-final`)) {', 'if (!mock.hasAttempted && !localStorage.getItem(`mock-${id}-first-final`)) {')
s = s.replace('        await fetch(appPath(`/api/mocks/${id}/attempts`), {', '        const response = await fetch(appPath(`/api/mocks/${id}/attempts`), {')
s = s.replace('''          cache: "no-store",
        });
      } catch (err) {
        console.error("Attempt submission error:", err);
      }''', '''          cache: "no-store",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Unable to save your attempt. Please try again.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to save your attempt. Please try again.");
        setSubmitting(false);
        return;
      }''')
p.write_text(s, encoding='utf-8')

# Keep the repeatable browser regression alongside the application it verifies.
source = Path(r'C:/Users/chand/Downloads/urocms/scripts/test-mock-browser.cjs').read_text(encoding='utf-8')
source = source.replace("require('../../testing-zone/node_modules/puppeteer-core')", "require('puppeteer-core')")
source = source.replace("path.resolve('.test-artifacts')", "path.resolve('.viva-test-artifacts/mocks')")
source = source.replace('userAttempt: { score: 2,', 'userAttempt: { score: 1,')
source = source.replace('/2\\/1/', '/1\\/1/')
source = source.replace("    const review = await page.$('article button');\n", '')
(root / 'tests/browser/mock-review.cjs').write_text(source, encoding='utf-8')
print('Finalized ranking data, submission error handling and browser regression.')
