import { useId, type InputHTMLAttributes } from "react";
import countryRows from "@/lib/world-countries.json";
import type { Locale } from "@/lib/siteData";

type CountryRow = {
  code: string;
  alpha3: string;
  name: string;
  callingCodes: string[];
};
const allCountries = countryRows as CountryRow[];
const dialCodes = [
  ...Array.from(new Set(allCountries.flatMap(country => country.callingCodes))),
].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

function localizedName(country: CountryRow, locale: Locale) {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(country.code) ||
      country.name
    );
  } catch {
    return country.name;
  }
}

export function getLocalizedCountryOptions(locale: Locale) {
  return allCountries
    .map(country => ({
      code: country.code,
      name: localizedName(country, locale),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function countryIsoCodeForName(countryName: string, locale: Locale) {
  const target = normalize(countryName);
  if (!target) return "";
  const country = allCountries.find(
    item =>
      item.code.toLocaleLowerCase() === target ||
      item.alpha3?.toLocaleLowerCase() === target ||
      normalize(item.name) === target ||
      normalize(localizedName(item, locale)) === target
  );
  return country?.code || "";
}

export function callingCodeForCountry(countryName: string, locale: Locale) {
  const target = normalize(countryName);
  if (!target) return "";
  const country = allCountries.find(
    item =>
      item.code.toLocaleLowerCase() === target ||
      item.alpha3?.toLocaleLowerCase() === target ||
      normalize(item.name) === target ||
      normalize(localizedName(item, locale)) === target
  );
  return country?.callingCodes[0] || "";
}

export function CountryField({
  value,
  onChange,
  locale,
  label,
  placeholder = "Choisir ou saisir un pays",
  className = "",
  required = false,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "placeholder" | "className" | "required"
>) {
  const id = useId();
  const options = allCountries
    .map(country => localizedName(country, locale))
    .sort((a, b) => a.localeCompare(b, locale));
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium">
          {label}
        </label>
      )}
      <input
        {...props}
        id={id}
        list={`${id}-countries`}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete="country-name"
        className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <datalist id={`${id}-countries`}>
        {options.map(country => (
          <option key={country} value={country} />
        ))}
      </datalist>
    </div>
  );
}

export function PhoneCodeField({
  value,
  onChange,
  label = "Indicatif téléphonique",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-xs font-semibold">
          {label}
        </label>
      )}
      <input
        id={id}
        list={`${id}-dial-codes`}
        inputMode="tel"
        autoComplete="tel-country-code"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="+40"
        aria-label={label || "Indicatif téléphonique"}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <datalist id={`${id}-dial-codes`}>
        {dialCodes.map(code => (
          <option key={code} value={code} />
        ))}
      </datalist>
    </div>
  );
}
