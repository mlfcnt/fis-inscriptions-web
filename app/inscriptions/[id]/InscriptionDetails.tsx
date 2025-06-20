"use client";

import {
  Loader2,
  MapPinIcon,
  CalendarIcon,
  InfoIcon,
  ArrowLeft,
} from "lucide-react";
import {InscriptionActionsMenu} from "./InscriptionActionsMenu";
import {usePermissionToEdit} from "./usePermissionToEdit";
import {useInscription} from "../form/api";
import {parseLocalDate} from "@/app/lib/dates";
import {useCountryInfo} from "@/hooks/useCountryInfo";
import Image from "next/image";
import {Button} from "@/components/ui/button";
import React, {useState} from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {EventDetails} from "@/components/EventDetails";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {colorBadgePerGender} from "@/app/lib/colorMappers";
import Link from "next/link";
import {ContactModal} from "./ContactModal";
import {useUser} from "@clerk/nextjs";

interface InscriptionDetailsProps {
  id: string;
  genderFilter: "both" | "M" | "W";
  setGenderFilterAction: (value: "both" | "M" | "W") => void;
  isMixedEvent: boolean;
}

export const InscriptionDetails = ({
  id,
  genderFilter,
  setGenderFilterAction,
  isMixedEvent,
}: InscriptionDetailsProps) => {
  const {data: inscription, isLoading, error} = useInscription(id);
  const {user} = useUser();

  const permissionToEdit = usePermissionToEdit(inscription, "actionsBtn");

  const countryCode =
    inscription?.eventData.placeNationCode ||
    inscription?.eventData.organiserNationCode;
  const {flagUrl, countryLabel} = useCountryInfo(countryCode);

  const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center min-h-[400px] flex items-center justify-center">
        Une erreur est survenue lors de la récupération des données
      </div>
    );
  }

  if (!inscription) {
    return null;
  }

  const firstCodex = inscription.eventData?.competitions?.[0]?.codex;

  return (
    <div className="bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 md:mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="cursor-pointer bg-transparent hover:bg-slate-100 text-slate-700"
                >
                  <ArrowLeft className="h-5 w-5 mr-1" />
                  Retour
                </Button>
              </Link>
              <h1
                className="text-lg md:text-2xl font-medium text-slate-800 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
                style={{lineHeight: 1}}
              >
                <span className="md:hidden">Détail inscription</span>
                <span className="hidden md:inline">
                  Détails de l&apos;inscription
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      `px-2 md:px-3 py-0.5 rounded-full text-xs font-semibold flex items-center` +
                      (inscription.status === "open"
                        ? " bg-sky-100 text-sky-700 border border-sky-300"
                        : " bg-emerald-100 text-emerald-700 border border-emerald-300")
                    }
                    style={{minHeight: "1.5rem", width: "fit-content"}}
                  >
                    {inscription.status === "open" ? "Ouverte" : "Clôturée"}
                  </span>
                  {inscription.status === "email_sent" && (
                    <span
                      className="px-2 md:px-3 py-0.5 rounded-full text-xs font-semibold flex items-center bg-orange-100 text-orange-800 border border-orange-200"
                      style={{minHeight: "1.5rem", width: "fit-content"}}
                    >
                      Email envoyé
                    </span>
                  )}
                </div>
              </h1>
            </div>
            <div className="flex flex-row items-center gap-2 w-full md:w-auto">
              {firstCodex !== undefined && (
                <Dialog
                  open={isEventDetailsModalOpen}
                  onOpenChange={setIsEventDetailsModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-sm flex-1 md:flex-none text-xs md:text-base py-2 px-2 md:px-4"
                    >
                      <InfoIcon className="h-4 w-4 mr-1 md:mr-2" />
                      <span className="md:hidden">Détail</span>
                      <span className="hidden md:inline">
                        Détail de l&apos;événement
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] md:w-11/12 !max-w-none max-h-[90vh] overflow-y-auto">
                    <DialogTitle className="text-lg md:text-xl">
                      Détails de l&apos;événement
                    </DialogTitle>
                    <div className="mt-4">
                      <EventDetails
                        codex={firstCodex}
                        inscriptionId={Number(inscription.id)}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {user && (
                <div className="flex-shrink-0">
                  <ContactModal inscriptionId={id} />
                </div>
              )}
              {permissionToEdit && inscription && (
                <div className="flex-shrink-0">
                  <InscriptionActionsMenu
                    inscription={inscription}
                    readonly={!permissionToEdit}
                  />
                </div>
              )}
            </div>
          </div>

          {/* First Row */}
          <div className="mt-4 md:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Lieu Card */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-start">
              <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-sky-50 flex items-center justify-center mr-3 md:mr-4">
                <MapPinIcon className="h-5 w-5 md:h-6 md:w-6 text-sky-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
                  Lieu
                </p>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-0">
                  <p className="text-base md:text-lg font-semibold text-slate-800 truncate">
                    {inscription.eventData.place}
                  </p>
                  {countryCode && countryCode !== "Non renseigné" && (
                    <span className="md:ml-2 flex items-center text-sm md:text-lg font-semibold text-slate-700">
                      {flagUrl && (
                        <Image
                          src={flagUrl}
                          alt={countryLabel}
                          width={20}
                          height={16}
                          className="mr-1.5 inline-block h-4 w-5 object-cover border border-gray-200 rounded-sm"
                        />
                      )}
                      ({countryLabel})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Période Card */}
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm flex items-start">
              <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full bg-sky-50 flex items-center justify-center mr-3 md:mr-4">
                <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-sky-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">
                  Période
                </p>
                <p className="text-base md:text-lg font-semibold text-slate-800">
                  Du{" "}
                  {parseLocalDate(
                    inscription.eventData.startDate
                  )?.toLocaleDateString("fr-FR")}{" "}
                  au{" "}
                  {parseLocalDate(
                    inscription.eventData.endDate
                  )?.toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </div>
          {/* Creator and Date Info */}
          {inscription.createdBy && inscription.createdAt && (
            <p className="text-xs text-slate-400 mt-2 text-right">
              Créé par {inscription.createdBy ?? "Utilisateur inconnu"} le{" "}
              {new Date(inscription.createdAt).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
      </header>

      {/* Gender Filter - Only show if mixed event */}
      {isMixedEvent && inscription && (
        <div className="container mx-auto px-4 py-4 md:py-6">
          <h2 className="text-base md:text-lg font-medium text-slate-700 mb-3">
            Filtrer par genre
          </h2>
          <RadioGroup
            value={genderFilter}
            onValueChange={setGenderFilterAction}
            className="flex flex-row items-center gap-2 md:gap-6"
          >
            <div className="flex items-center space-x-1 cursor-pointer">
              <RadioGroupItem
                value="both"
                id="r1"
                className="cursor-pointer h-4 w-4 md:h-5 md:w-5"
              />
              <Label
                htmlFor="r1"
                className="cursor-pointer text-sm md:text-base"
              >
                <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-200 px-1.5 md:px-3 py-1 text-xs md:text-sm">
                  Tous
                </Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-1 cursor-pointer">
              <RadioGroupItem
                value="M"
                id="r2"
                className="cursor-pointer h-4 w-4 md:h-5 md:w-5"
              />
              <Label
                htmlFor="r2"
                className="cursor-pointer text-sm md:text-base"
              >
                <Badge
                  className={
                    colorBadgePerGender.M +
                    " text-white px-1.5 md:px-3 py-1 text-xs md:text-sm"
                  }
                >
                  <span className="md:hidden">H</span>
                  <span className="hidden md:inline">Hommes</span>
                </Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-1 cursor-pointer">
              <RadioGroupItem
                value="W"
                id="r3"
                className="cursor-pointer h-4 w-4 md:h-5 md:w-5"
              />
              <Label
                htmlFor="r3"
                className="cursor-pointer text-sm md:text-base"
              >
                <Badge
                  className={
                    colorBadgePerGender.W +
                    " text-white px-1.5 md:px-3 py-1 text-xs md:text-sm"
                  }
                >
                  <span className="md:hidden">F</span>
                  <span className="hidden md:inline">Femmes</span>
                </Badge>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );
};
