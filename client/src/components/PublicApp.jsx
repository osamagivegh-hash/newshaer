import React, { useState, useEffect, Suspense, lazy } from 'react'
import Header from './Header'
import NewsTickers from './NewsTickers'
import HeroSlider from './HeroSlider'
import Hero from './Hero'
import LoadingSpinner from './LoadingSpinner'
import LazySection from './common/LazySection'
import { FamilyTreeSection } from './FamilyTree'
import { fetchSectionsData, api } from '../utils/api'

// Lazy load components
const FbNewsSection = lazy(() => import('./FbNewsSection'))
const NewsHeroSlider = lazy(() => import('./NewsHeroSlider'))
const Conversations = lazy(() => import('./Conversations'))
const Palestine = lazy(() => import('./Palestine'))
const Articles = lazy(() => import('./Articles'))
const Gallery = lazy(() => import('./Gallery'))
const Contact = lazy(() => import('./Contact'))
const Footer = lazy(() => import('./Footer'))

const PublicApp = () => {
  const [sectionsData, setSectionsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch sections data
        const data = await fetchSectionsData()
        setSectionsData(data)

        // Record visit (fire and forget)
        api.post('/visits').catch(err => console.error('Visit recording failed:', err))
      } catch (err) {
        setError('فشل في تحميل البيانات')
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-palestine-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-palestine-red mb-4">خطأ في التحميل</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-4"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  const SectionFallback = ({ name }) => (
    <div className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-palestine-green mx-auto mb-4"></div>
        <p className="text-gray-600">جاري تحميل {name}...</p>
      </div>
    </div>
  )

  return (
    <>
      <Header />
      <NewsTickers />
      <main style={{ paddingTop: '150px' }} className="md:pt-[10rem]">
        <Suspense fallback={<div className="w-full h-[300px] md:h-[420px] bg-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-palestine-green"></div></div>}>
          <NewsHeroSlider />
        </Suspense>
        <HeroSlider />
        <Hero />

        {/* Family Tree Section */}
        <FamilyTreeSection />

        <LazySection>
          <Suspense fallback={<SectionFallback name="الأخبار" />}>
            <FbNewsSection />
          </Suspense>
        </LazySection>

        <LazySection>
          <Suspense fallback={<SectionFallback name="الحوارات" />}>
            <Conversations data={sectionsData?.conversations || []} />
          </Suspense>
        </LazySection>

        <LazySection>
          <Suspense fallback={<SectionFallback name="فلسطين" />}>
            <Palestine data={sectionsData?.palestine || []} />
          </Suspense>
        </LazySection>

        <LazySection>
          <Suspense fallback={<SectionFallback name="المقالات" />}>
            <Articles data={sectionsData?.articles || []} />
          </Suspense>
        </LazySection>

        <LazySection>
          <Suspense fallback={<SectionFallback name="معرض الصور" />}>
            <Gallery data={sectionsData?.gallery || []} />
          </Suspense>
        </LazySection>

        <LazySection>
          <Suspense fallback={<SectionFallback name="التواصل" />}>
            <Contact />
          </Suspense>
        </LazySection>
      </main>

      <Suspense fallback={<SectionFallback name="التذييل" />}>
        <Footer />
      </Suspense>
    </>
  )
}

export default PublicApp
