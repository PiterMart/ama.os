"use client"
import { useEffect, useState } from "react";
import { firestore } from "./firebaseConfig";
import { getDocs, collection, doc, updateDoc, getDoc } from "firebase/firestore";
import styles from "../../styles/page.module.css";

// Constant for the bilingual month dropdown
const BILINGUAL_MONTHS = [
  { en: "January", es: "Enero" }, { en: "February", es: "Febrero" },
  { en: "March", es: "Marzo" }, { en: "April", es: "Abril" },
  { en: "May", es: "Mayo" }, { en: "June", es: "Junio" },
  { en: "July", es: "Julio" }, { en: "August", es: "Agosto" },
  { en: "September", es: "Septiembre" }, { en: "October", es: "Octubre" },
  { en: "November", es: "Noviembre" }, { en: "December", es: "Diciembre" },
];

const initialScheduleItem = { month: { en: "", es: "" }, artists: [{ name: "", artistId: "" }] };

export default function HeadquarterEditor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [headquartersList, setHeadquartersList] = useState([]);
  const [selectedHeadquarterId, setSelectedHeadquarterId] = useState("");
  const [formData, setFormData] = useState(null);
  const [artistsList, setArtistsList] = useState([]);

  // Fetch headquarters and artists on initial load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const hqSnapshot = await getDocs(collection(firestore, "headquarters"));
        setHeadquartersList(hqSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        
        const artistSnapshot = await getDocs(collection(firestore, "artists"));
        setArtistsList(artistSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name })));
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch initial data.");
      }
    };
    fetchData();
  }, []);

  // Load selected headquarter data into the form
  const handleHeadquarterSelection = async (id) => {
    setSelectedHeadquarterId(id);
    if (!id) {
      setFormData(null);
      return;
    }
    setLoading(true);
    try {
      const hqDoc = await getDoc(doc(firestore, "headquarters", id));
      if (hqDoc.exists()) {
        const data = hqDoc.data();
        setFormData({
          name: data.name || "",
          type: data.type || "",
          location: data.location || "",
          phone: data.phone || "",
          arthouse: data.arthouse || "",
          arthouseimage: data.arthouseimage || "",
          about: { en: data.aboutEng || [], es: data.about || [] },
          galleryProgram: data.galleryProgram || { en: "", es: "" },
          residencyProgram: data.residencyProgram || { description: { en: [], es: [] }, schedule: {} },
        });
      }
    } catch (err) {
      setError("Failed to load headquarter data.");
    } finally {
      setLoading(false);
    }
  };

  // --- FORM STATE HANDLERS ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNestedInputChange = (field, lang, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: { ...prev[field], [lang]: value },
    }));
  };
  
  const handleResidencyDescriptionChange = (lang, value) => {
    setFormData(prev => ({
      ...prev,
      residencyProgram: {
        ...prev.residencyProgram,
        description: {
          ...prev.residencyProgram.description,
          [lang]: value,
        },
      },
    }));
  };
  
  const handleMonthSelection = (year, monthIndex, selectedMonthEN) => {
    const monthObj = BILINGUAL_MONTHS.find(m => m.en === selectedMonthEN) || { en: "", es: "" };
    handleResidencyChange(year, monthIndex, null, 'month', monthObj);
  };

  const handleResidencyArtistSelection = (year, monthIndex, artistIndex, selectedArtistId) => {
    const artist = artistsList.find(a => a.id === selectedArtistId);
    const artistData = artist ? { name: artist.name, artistId: artist.id } : { name: "", artistId: "" };
    handleResidencyChange(year, monthIndex, artistIndex, 'artist', artistData);
  };
  
  const handleResidencyChange = (year, monthIndex, artistIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      residencyProgram: {
        ...prev.residencyProgram,
        schedule: {
          ...prev.residencyProgram.schedule,
          [year]: prev.residencyProgram.schedule[year].map((month, mIndex) => {
            if (mIndex !== monthIndex) return month;

            if (field === 'month') return { ...month, month: value };
            if (field === 'artist') return { ...month, artists: month.artists.map((a, aIndex) => aIndex === artistIndex ? value : a) };
            
            const updatedArtists = month.artists.map((artist, aIndex) => {
                if (aIndex !== artistIndex) return artist;
                return { ...artist, [field]: value };
            });
            return { ...month, artists: updatedArtists };
          })
        }
      }
    }));
  };
  
  const addArtistToMonth = (year, monthIndex) => setFormData(prev => ({ ...prev, residencyProgram: { ...prev.residencyProgram, schedule: { ...prev.residencyProgram.schedule, [year]: prev.residencyProgram.schedule[year].map((month, index) => index === monthIndex ? { ...month, artists: [...month.artists, { name: "", artistId: "" }] } : month) } } }));
  const removeArtistFromMonth = (year, monthIndex, artistIndex) => setFormData(prev => ({ ...prev, residencyProgram: { ...prev.residencyProgram, schedule: { ...prev.residencyProgram.schedule, [year]: prev.residencyProgram.schedule[year].map((month, index) => index === monthIndex ? { ...month, artists: month.artists.filter((_, aIndex) => aIndex !== artistIndex) } : month) } } }));
  const addMonthToSchedule = (year) => { const currentYearSchedule = formData.residencyProgram.schedule[year] || []; setFormData(prev => ({...prev, residencyProgram: { ...prev.residencyProgram, schedule: { ...prev.residencyProgram.schedule, [year]: [...currentYearSchedule, { ...initialScheduleItem }] } } })); };
  const removeMonthFromSchedule = (year, monthIndex) => setFormData(prev => ({ ...prev, residencyProgram: { ...prev.residencyProgram, schedule: { ...prev.residencyProgram.schedule, [year]: prev.residencyProgram.schedule[year].filter((_, index) => index !== monthIndex) } } }));

  // --- FORM SUBMISSION ---

  const handleSubmit = async () => {
    if (!selectedHeadquarterId) { 
      setError("Please select a headquarter to update."); 
      return; 
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { name, type, location, phone, arthouse, arthouseimage, about, galleryProgram, residencyProgram } = formData;
      const dataToUpdate = {
        name, type, location, phone, arthouse, arthouseimage,
        about: about.es,
        aboutEng: about.en,
        galleryProgram: galleryProgram,
        residencyProgram: residencyProgram,
      };

      const hqRef = doc(firestore, "headquarters", selectedHeadquarterId);
      await updateDoc(hqRef, dataToUpdate);
      setSuccess("Headquarter updated successfully!");
    } catch (err) {
      setError("Failed to update headquarter.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.form}>
      <h2>Headquarter Editor</h2>
      
      <label>Select Headquarter to Edit</label>
      <select value={selectedHeadquarterId} onChange={(e) => handleHeadquarterSelection(e.target.value)}>
        <option value="">-- Select a Headquarter --</option>
        {headquartersList.map((hq) => (<option key={hq.id} value={hq.id}>{hq.name}</option>))}
      </select>

      {formData && (
        <>
          {/* Basic Info */}
          <input name="name" placeholder="Headquarter Name" value={formData.name} onChange={handleInputChange} />
          <input name="type" placeholder="Type (e.g. gallery + art residency)" value={formData.type} onChange={handleInputChange} />
          <input name="location" placeholder="Location" value={formData.location} onChange={handleInputChange} />
          <input name="phone" placeholder="Phone" value={formData.phone} onChange={handleInputChange} />
          <hr/>

          {/* Arthouse Section */}
          <label>Arthouse Description</label>
          <textarea name="arthouse" placeholder="Arthouse Description" value={formData.arthouse} onChange={handleInputChange} />
          <input name="arthouseimage" placeholder="Arthouse Image URL" value={formData.arthouseimage} onChange={handleInputChange} />
          <hr/>
          
          {/* About Section */}
          <label>About (English)</label>
          <textarea placeholder="About in English (one paragraph per line)" value={(formData.about.en || []).join('\n')} onChange={(e) => handleNestedInputChange('about', 'en', e.target.value.split('\n'))} />
          <label>About (Español)</label>
          <textarea placeholder="About in Spanish (one paragraph per line)" value={(formData.about.es || []).join('\n')} onChange={(e) => handleNestedInputChange('about', 'es', e.target.value.split('\n'))} />
          <hr/>

          {/* Gallery Program Section */}
          <label>Gallery Program (English)</label>
          <textarea placeholder="Gallery Program in English" value={formData.galleryProgram.en} onChange={(e) => handleNestedInputChange('galleryProgram', 'en', e.target.value)} />
          <label>Gallery Program (Español)</label>
          <textarea placeholder="Gallery Program in Spanish" value={formData.galleryProgram.es} onChange={(e) => handleNestedInputChange('galleryProgram', 'es', e.target.value)} />
          <hr />
          
          {/* Residency Program Section */}
          <h3>Residency Program</h3>
          <label>Description (English)</label>
          <textarea placeholder="Residency Description (English)" value={(formData.residencyProgram.description.en || []).join('\n')} onChange={(e) => handleResidencyDescriptionChange('en', e.target.value.split('\n'))} />
          <label>Description (Español)</label>
          <textarea placeholder="Residency Description (Español)" value={(formData.residencyProgram.description.es || []).join('\n')} onChange={(e) => handleResidencyDescriptionChange('es', e.target.value.split('\n'))} />
          
          {/* Residency Schedule Editor */}
          <h4>Residency Schedule</h4>
          {Object.keys(formData.residencyProgram.schedule).sort().map(year => (
            <div key={year} className={styles.yearSection}>
              <h4>{year}</h4>
              {formData.residencyProgram.schedule[year].map((monthData, monthIndex) => (
                <div key={monthIndex} className={styles.monthSection}>
                  <label>Month</label>
                  <select value={monthData.month.en} onChange={(e) => handleMonthSelection(year, monthIndex, e.target.value)}>
                    <option value="">-- Select Month --</option>
                    {BILINGUAL_MONTHS.map(m => <option key={m.en} value={m.en}>{m.en} / {m.es}</option>)}
                  </select>

                  {monthData.artists.map((artist, artistIndex) => (
                    <div key={artistIndex} className={styles.artistSection}>
                      <label>Select Existing Artist (Optional)</label>
                      <select onChange={(e) => handleResidencyArtistSelection(year, monthIndex, artistIndex, e.target.value)}>
                        <option value="">-- Manual Entry --</option>
                        {artistsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      
                      <input placeholder="Artist Name" value={artist.name} onChange={(e) => handleResidencyChange(year, monthIndex, artistIndex, 'name', e.target.value)} />
                      <input placeholder="Artist ID (optional)" value={artist.artistId || ''} onChange={(e) => handleResidencyChange(year, monthIndex, artistIndex, 'artistId', e.target.value)} />
                      <button type="button" onClick={() => removeArtistFromMonth(year, monthIndex, artistIndex)}>Remove Artist</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addArtistToMonth(year, monthIndex)}>Add Artist</button>
                  <button type="button" style={{color: 'red'}} onClick={() => removeMonthFromSchedule(year, monthIndex)}>Remove Month</button>
                </div>
              ))}
              <button type="button" onClick={() => addMonthToSchedule(year)}>Add Month to {year}</button>
            </div>
          ))}
          <button type="button" onClick={() => addMonthToSchedule(new Date().getFullYear() + 1)}>Add Slot to Next Year</button>

          {/* Submit Button */}
          <div style={{ margin: 'auto', paddingTop: '2rem' }}>
            <p className={styles.subtitle}> ALL READY? </p>
            <button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Updating..." : "UPDATE HEADQUARTER"}
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
        </>
      )}
    </div>
  );
}