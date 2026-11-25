import { AppRouter } from './ui/navigation/AppRouter';
import { PreferenciasProvider } from './ui/context/PreferenciasContext';
import { ContenidoWebProvider } from './ui/context/ContenidoWebContext';
import { SplashScreenCootranar } from './ui/components/common/SplashScreenCootranar';
import { LogoutScreenCootranar } from './ui/components/common/LogoutScreenCootranar';

function App() {
  return (
    <PreferenciasProvider>
      <ContenidoWebProvider>
        <SplashScreenCootranar />
        <LogoutScreenCootranar />
        <AppRouter />
      </ContenidoWebProvider>
    </PreferenciasProvider>
  );
}

export default App;
