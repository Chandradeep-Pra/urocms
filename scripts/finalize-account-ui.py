from pathlib import Path
root=Path(r'C:/Users/chand/Downloads/testing-zone')
p=root/'app/user/page.tsx';s=p.read_text(encoding='utf-8').replace('  }, [profileMedicalInstitution]);','  }, [profileMedicalInstitution, profilePhone]);');p.write_text(s,encoding='utf-8')
p=root/'app/page.tsx';s=p.read_text(encoding='utf-8').replace('''          <div className="overview-section-gap">
            <LessonHistorySection lessons={lessons} loading={lessonsLoading} isLoggedIn={Boolean(user)} />
          </div>''','''          {Boolean(user) && (lessonsLoading || lessons.length > 0) && <div className="overview-section-gap">
            <LessonHistorySection lessons={lessons} loading={lessonsLoading} isLoggedIn={Boolean(user)} />
          </div>}''');p.write_text(s,encoding='utf-8')
p=root/'app/ai-viva/cases/page.tsx';s=p.read_text(encoding='utf-8').replace('selectedModes[viva.id] === "fast" ? "bg-orange-600','getSelectedMode(viva) === "fast" ? "bg-orange-600');p.write_text(s,encoding='utf-8')
p=root/'components/profile/CompleteProfilePrompt.tsx';s=p.read_text(encoding='utf-8').replace('    if (!selectedCountry.name.trim()) {','    if (!countryValue || !selectedCountry.name.trim()) {');s=s.replace('    if (!password) {','    if (!medicalInstitution.trim()) { toast.error("Please enter your medical institution."); return; }\n\n    if (!confirmPassword) { toast.error("Please confirm your password."); return; }\n\n    if (!password) {');
for label in ['Full name','Country','Phone number','Medical Institution','Password','Confirm Password']:
    s=s.replace(f'                {label}\n',f'                {label} <span aria-hidden="true" className="text-red-500">*</span>\n')
p.write_text(s,encoding='utf-8')
print('Completed account UI refinements.')
