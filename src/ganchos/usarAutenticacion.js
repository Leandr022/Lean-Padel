import { useContext } from "react";
import { ContextoAutenticacion } from "../contextos/ContextoAutenticacion.jsx";
export default function usarAutenticacion() { return useContext(ContextoAutenticacion); }
