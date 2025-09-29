import "dotenv/config";
import { db } from "./index";
import { tourPackages } from "./schema";
import { eq } from "drizzle-orm";

async function up() {
  const rows = [
    {
      slug: "dibba-musandam-2024",
      title: "Dibba Musandam Full Day Cruise",
      shortDescription: "Dhow cruise with water sports, buffet lunch, and cave visits.",
      longDescription: `
Musandam is an ideal place for those looking for a refreshing sea adventure.
Includes snorkeling, banana boat ride, buffet lunch, cave visit, and tea/snacks.
Itinerary highlights:
- Pickup from Dubai/Sharjah
- Border assistance
- 5–6 hrs dhow cruise with activities
- Buffet lunch onboard
- Evening tea
- Return by 4 PM
      `,
      location: "Dibba, Musandam (Oman/UAE border)",
      durationDays: 1,
      priceAED: "179.00", // adult price from brochure
      heroImage: "https://yourcdn.com/images/dibba.jpg",
      isFeatured: true,
    },
    {
      slug: "kyrgyzstan-3n4d-2024",
      title: "Kyrgyzstan 3 Nights / 4 Days",
      shortDescription: "Explore Bishkek, Ala Archa National Park, and Alamedin Gorge.",
      longDescription: `
Mini Switzerland of Central Asia.
Day 1: Bishkek city highlights (White House, Oak Park, Victory Square).
Day 2: Bishkek & Ala Archa National Park.
Day 3: Alamedin Gorge tour, horse riding, hot air balloon.
Day 4: Departure.
Includes: flights, 3N hotel, airport transfers, sightseeing, insurance, private driver.
      `,
      location: "Bishkek & Tian Shan mountains, Kyrgyzstan",
      durationDays: 4,
      priceAED: "2599.00", // estimate based on package with flights
      heroImage: "https://yourcdn.com/images/kyrgyzstan.jpg",
      isFeatured: true,
    },
    {
      slug: "desert-safari-exclusive-2024",
      title: "Abu Dhabi Desert Safari (Exclusive Program)",
      shortDescription: "Evening desert safari with dune bashing, camel rides, BBQ, and live shows.",
      longDescription: `
Thrilling adventure with dune bashing, sandboarding, camel rides, sunset photos,
BBQ buffet dinner, belly dance, Tanura, fire show, henna, and Arabic coffee.
Itinerary highlights:
- 4:00 PM Entry & dune bashing
- Camel riding & sunset photography
- 7:30 PM BBQ dinner
- 8:00 PM Belly dance, Tanura & fire show
- 12:30 AM camp ends
      `,
      location: "Abu Dhabi Desert, UAE",
      durationDays: 1,
      priceAED: "249.00",
      heroImage: "https://yourcdn.com/images/desert-safari.jpg",
      isFeatured: false,
    },
  ];

  for (const r of rows) {
    const existing = await db.query.tourPackages.findFirst({
      where: (pkg, { eq }) => eq(pkg.slug, r.slug),
      columns: { id: true },
    });
    if (existing) {
      await db.update(tourPackages).set(r).where(eq(tourPackages.slug, r.slug));
    } else {
      await db.insert(tourPackages).values(r);
    }
  }
  console.log("Seeded tour packages in AED ✅");
}

up().catch((e) => {
  console.error(e);
  process.exit(1);
});
