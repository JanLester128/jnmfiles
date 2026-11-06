import {
    Compass,
    Database,
    FileArchive,
    FileCheck,
    FileCode,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    MapPin,
    Navigation,
    Scan,
} from 'lucide-react';

interface FileIconProps {
    extension: string;
    category?: string;
    className?: string;
}

export default function FileIcon({ extension, category, className = 'size-8' }: FileIconProps) {
    const ext = (extension || '').toLowerCase();

    // DLSD Survey Data Files
    if (ext === 'dlsd' || category === 'dlsd') {
        return <Navigation className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    }

    // XML / LandXML Files
    if (ext === 'xml' || category === 'xml') {
        return <FileCode className={`${className} text-amber-600 dark:text-amber-400`} />;
    }

    // CAD Drawings (DWG, DXF)
    if (category === 'cad' || ['dwg', 'dxf', 'dwt', 'dwf', 'dgn', 'rvt', 'ifc'].includes(ext)) {
        return <Compass className={`${className} text-cyan-600 dark:text-cyan-400`} />;
    }

    // Images (JPG, PNG)
    if (category === 'photo' || ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'bmp', 'webp'].includes(ext)) {
        return <ImageIcon className={`${className} text-rose-600 dark:text-rose-400`} />;
    }

    // GIS & Spatial
    if (category === 'gis' || ['shp', 'shx', 'dbf', 'prj', 'kml', 'kmz', 'geojson', 'gpkg', 'dem'].includes(ext)) {
        return <MapPin className={`${className} text-purple-600 dark:text-purple-400`} />;
    }

    // LiDAR & 3D Point Clouds
    if (category === 'lidar' || ['las', 'laz', 'e57', 'pts', 'xyz'].includes(ext)) {
        return <Scan className={`${className} text-orange-600 dark:text-orange-400`} />;
    }

    // Survey Raw Data & Coordinates
    if (category === 'raw_survey' || ['raw', 'rw5', 'crd', 'dat', 'jxl', 'rinex', 'obs', 'nav', 'asc'].includes(ext)) {
        return <Navigation className={`${className} text-blue-600 dark:text-blue-400`} />;
    }

    // Spreadsheets / Coordinates CSV
    if (ext === 'csv') {
        return <Database className={`${className} text-sky-600 dark:text-sky-400`} />;
    }
    if (['xls', 'xlsx'].includes(ext)) {
        return <FileSpreadsheet className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    }

    // Plats, Legal Reports, PDFs
    if (ext === 'pdf') {
        return <FileCheck className={`${className} text-red-600 dark:text-red-400`} />;
    }
    if (['doc', 'docx', 'txt', 'rtf', 'ppt', 'pptx'].includes(ext)) {
        return <FileText className={`${className} text-blue-600 dark:text-blue-400`} />;
    }

    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return <FileArchive className={`${className} text-amber-600 dark:text-amber-400`} />;
    }

    return <FileCode className={`${className} text-slate-500`} />;
}
